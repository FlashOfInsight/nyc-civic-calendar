# NYC Civic Calendar - Development Status

**Last Updated:** January 20, 2026

## What This App Does

A web app that lets NYC residents subscribe to personalized ICS calendar feeds for municipal government meetings. Users select which government bodies to track, get a custom calendar URL, and it auto-updates daily via scrapers.

**Live at:** https://nyc-civic-calendar.vercel.app

## Tech Stack
- **Frontend:** Vanilla JS, HTML/CSS
- **Backend:** Vercel serverless functions (Node.js)
- **Storage:** GitHub Gist (migrated from Vercel Blob on Jan 20, 2026)
- **Scraping:** Cheerio + daily cron job

---

## Current State (as of Jan 20, 2026)

**Total Meetings:** 1,109
**Active Organizations:** 193

### Completed Scrapers

| Source | File | Status | Meetings |
|--------|------|--------|----------|
| City Council | `lib/scrapers/city-council.js` | ✅ Working | 12 |
| MTA | `lib/scrapers/mta.js` | ✅ Working | 28 |
| Agencies | `lib/scrapers/agencies.js` | ✅ Working | 44 |
| Community Boards (59) | `lib/scrapers/community-boards.js` | ✅ Working | 881 |
| CCRB, LPC, BSA, RGB | `lib/scrapers/oversight-boards.js` | ✅ Working | 58 |
| NYC Rules (multi-agency) | `lib/scrapers/nyc-rules.js` | ✅ Working | 12 |
| **City Government (Phase 2)** | `lib/scrapers/city-government.js` | ✅ NEW | 74 |

### Phase 2 Scrapers (Completed Jan 20, 2026)

| Source | Org Key | Meetings | Schedule |
|--------|---------|----------|----------|
| City Planning Commission | `city-agencies.dcp.commission` | 13 | Biweekly Wednesdays @ 10am |
| Comptroller Investment | `city-agencies.comptroller.investment` | 3 | Bi-monthly |
| DCAS Hearings | `city-agencies.dcas.hearings` | 7 | Monthly (3rd Wednesday) |
| Brooklyn Borough President | `borough-presidents.brooklyn` | 9 | Various events |
| DOB Buildings After Hours | `city-agencies.dob.after-hours` | 11 | 1st & 3rd Tuesdays, 4-7pm |
| DOB Industry Meetings | `city-agencies.dob.industry-*` | 31 | Monthly per borough |

---

## Recent Changes

### January 20, 2026 - Phase 2 + Infrastructure

1. **Migrated storage from Vercel Blob to GitHub Gist**
   - Vercel Blob free tier (2,000 ops/month) was exhausted
   - Gist raw URLs are free and unlimited for reads
   - Created `lib/gist-storage.js` helper module

2. **Implemented Phase 2 scrapers** (`lib/scrapers/city-government.js`):
   - City Planning Commission (biweekly schedule generation)
   - Comptroller Investment Advisory Committee
   - DCAS Civil Service Hearings
   - Brooklyn Borough President (JSON-LD parsing)
   - DOB Buildings After Hours
   - DOB Industry Meetings (5 boroughs)

3. **Updated frontend** (`public/app.js`) with all Phase 2 organizations

4. **Fixed cron authentication** for Vercel Hobby plan compatibility

5. **Changed cron from weekly to daily** (6 AM UTC)

---

## Phase 3 (Future)

Lower priority items identified during research:

- Other Borough Presidents (Manhattan, Queens, Bronx, Staten Island) - use Brooklyn BP as template
- NYPD 77 Precinct Community Councils (complex - 77 separate pages)
- NYCEDC board entities (IDA, Build NYC, etc.)
- DOE Citywide Councils (CCHS, CCSE, CCD75, CCELL)
- DOE Community Education Councils (32 districts)
- NYC Water Board
- IBO Advisory Board
- NYCHDC Board Meetings

---

## Key Files

| File | Purpose |
|------|---------|
| `api/cron.js` | Daily scraper runner, writes to GitHub Gist |
| `api/calendar.ics.js` | Generates personalized ICS feeds |
| `api/active-orgs.js` | Returns orgs with active meetings |
| `lib/gist-storage.js` | GitHub Gist read/write helpers |
| `lib/organizations.js` | Org hierarchy for UI |
| `lib/ics-generator.js` | ICS format creation |
| `lib/scrapers/*.js` | Individual scrapers |
| `public/app.js` | Frontend UI |

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `GIST_ID` | GitHub Gist ID for data storage |
| `GITHUB_TOKEN` | GitHub PAT for Gist writes (expires Jan 2027) |
| `REFRESH_SECRET` | Secret for manual cron triggers |

---

## How to Test

### Test a specific scraper
```bash
cd ~/nyc-civic-calendar

node -e "
const { scrapeCityGovernment } = require('./lib/scrapers/city-government');
scrapeCityGovernment().then(m => console.log('Found', m.length, 'meetings'));
"
```

### Manually trigger cron
```bash
curl "https://nyc-civic-calendar.vercel.app/api/cron?secret=YOUR_REFRESH_SECRET"
```

### Test a calendar endpoint
```bash
curl "https://nyc-civic-calendar.vercel.app/api/calendar.ics?orgs=city-agencies.dob"
```

---

## Deployment

Push to main branch triggers Vercel deployment. The cron job runs **daily at 6 AM UTC** per `vercel.json`.

---

## Maintenance Checklist (Quarterly)

1. **Run manual cron** to verify scrapers still work
2. **Check meeting counts** via `/api/debug` - if any source returns 0, scraper may need updating
3. **Renew GitHub token** before January 2027

---

## Architecture Notes

- **Resilient cron**: Never overwrites good data with empty data. If a scraper fails, existing future meetings are preserved.
- **Minimum thresholds**: Warns if scraper returns suspiciously few results
- **Deduplication**: Merges new meetings with existing by ID
- **Active orgs**: Only shows orgs in UI that have actual meetings

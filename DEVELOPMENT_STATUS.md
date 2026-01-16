# NYC Civic Calendar - Development Status

**Last Updated:** January 15, 2026

## What This App Does

A web app that lets NYC residents subscribe to personalized ICS calendar feeds for municipal government meetings. Users select which government bodies to track, get a custom calendar URL, and it auto-updates weekly via scrapers.

**Live at:** Deployed on Vercel (check vercel.json for config)

## Tech Stack
- **Frontend:** Vanilla JS, HTML/CSS
- **Backend:** Vercel serverless functions (Node.js)
- **Storage:** Vercel Blob
- **Scraping:** Cheerio + weekly cron job

---

## Current State (as of Jan 15, 2026)

### Completed Scrapers

| Source | File | Status |
|--------|------|--------|
| City Council | `lib/scrapers/city-council.js` | ✅ Working |
| MTA | `lib/scrapers/mta.js` | ✅ Working |
| DOB/DOE Agencies | `lib/scrapers/agencies.js` | ✅ Working |
| Community Boards (59) | `lib/scrapers/community-boards.js` | ✅ Working |
| **CCRB, LPC, BSA, RGB** | `lib/scrapers/oversight-boards.js` | ✅ NEW - Phase 1 |
| **NYC Rules (multi-agency)** | `lib/scrapers/nyc-rules.js` | ✅ NEW - Phase 1 |

### Recent Changes (Phase 1 - Just Completed)

1. **Future-proofed cron.js** - Never overwrites good data with empty data, merges meetings, preserves active-orgs stability

2. **Added oversight-boards.js scraper:**
   - CCRB Board Meetings (monthly, 2nd Wed)
   - LPC Public Hearings (weekly, Tuesdays)
   - BSA Public Hearings (weekly, Mon-Tue)
   - RGB Meetings/Hearings (Jan-Jun cycle)

3. **Added nyc-rules.js scraper:**
   - Scrapes rules.cityofnewyork.us/calendar/
   - Covers rulemaking hearings for 20+ agencies
   - Uses JSON data embedded in page (`hearing_array`)

4. **Updated organizations.js** with new agency hierarchy

---

## Next Up: Phase 2

**These scrapers need to be implemented next:**

### 1. City Planning Commission (CPC)
- **URL:** https://www.nyc.gov/site/planning/about/commission-meetings.page
- **Frequency:** Biweekly (Wednesdays, 10 AM)
- **Notes:** Land use hearings, ULURP reviews. Calendar in PDF format.

### 2. Comptroller Investment Meetings
- **URL:** https://comptroller.nyc.gov/services/financial-matters/pension/investment-meetings/
- **Frequency:** 6x/year (Common Investment Meeting) + monthly per fund
- **Notes:** Uses DataTable HTML - highly scrapeable

### 3. DCAS Civil Service Hearings
- **URL:** https://www.nyc.gov/site/dcas/about/public-hearings.page
- **Frequency:** Monthly
- **Notes:** Simple HTML list format

### 4. Brooklyn Borough President (template for other BPs)
- **URL:** https://brooklynbp.nyc.gov/events/list/
- **Frequency:** Monthly (Borough Board + ULURP hearings)
- **Notes:** Uses "The Events Calendar" WordPress plugin with JSON-LD. Good template for other Borough Presidents.

### 5. DOB Buildings After Hours
- **URL:** https://www.nyc.gov/site/buildings/dob/upcoming-events.page
- **Frequency:** 2x/month per borough (1st & 3rd Tuesday)
- **Notes:** Walk-in help sessions. Predictable schedule.

---

## Phase 3 (Future)

Lower priority items identified during research:

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
| `api/cron.js` | Weekly scraper runner, writes to Vercel Blob |
| `api/calendar.ics.js` | Generates personalized ICS feeds |
| `api/active-orgs.js` | Returns orgs with active meetings |
| `lib/organizations.js` | Org hierarchy for UI |
| `lib/ics-generator.js` | ICS format creation |
| `lib/scrapers/*.js` | Individual scrapers |
| `public/app.js` | Frontend UI |

---

## How to Test Scrapers Locally

```bash
cd ~/nyc-civic-calendar

# Test a specific scraper
node -e "
const { scrapeOversightBoards } = require('./lib/scrapers/oversight-boards');
scrapeOversightBoards().then(m => console.log('Found', m.length, 'meetings'));
"

# Check syntax of all files
node --check api/cron.js
```

---

## Deployment

Push to main branch triggers Vercel deployment. The cron job runs weekly (Sundays 6 AM EST) per `vercel.json`.

To manually trigger the cron:
```
GET /api/cron?secret=YOUR_REFRESH_SECRET
```

---

## Notes for Next Session

1. **Start with Phase 2 scrapers** - the todo list was set up but not started
2. **City Planning Commission** is highest priority (biweekly land use hearings)
3. **Brooklyn BP scraper** should be designed as a template for all 5 Borough Presidents
4. Consider combining Phase 2 scrapers into a single file like `city-government.js`

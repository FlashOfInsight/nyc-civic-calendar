# NYC Civic Calendar

Subscribe to a personalized ICS calendar feed of NYC government meetings — pick the bodies you care about, get a URL, add it to your calendar app.

**Live:** https://nycciviccalendar.com
**Legacy (grace period until 2026-06-30):** https://nyc-civic-calendar.vercel.app

## Architecture

```
              ┌───────────────────┐
              │  GitHub Actions   │  Daily at 6 AM UTC
              │ scripts/run-      │  runs 8 scrapers in parallel,
              │ scrapers.js       │  writes JSON to a GitHub Gist
              └─────────┬─────────┘
                        │ PATCH
                        ▼
              ┌───────────────────┐
              │   GitHub Gist     │  Single source of truth for
              │  (public reads)   │  all meeting data
              └─────────┬─────────┘
                        │ read
         ┌──────────────┴──────────────┐
         ▼                             ▼
┌──────────────────┐         ┌──────────────────┐
│ Cloudflare Pages │         │     Vercel       │
│ nycciviccalendar │         │ (legacy, grace   │
│      .com        │         │  period only)    │
│                  │         │                  │
│ /api/calendar.ics│         │ /api/calendar.ics│
│ /api/active-orgs │         │   injects        │
│ /api/debug       │         │   migration      │
│ clean ICS        │         │   prefix into    │
│                  │         │   every event    │
└──────────────────┘         └──────────────────┘
```

**Why two hosts?** The site migrated off Vercel on 2026-04-23 following Vercel's security incident. Our data was not affected — the move was proactive. Vercel stays live for 60 days serving a migration notice to existing subscribers, then gets decommissioned on **2026-06-30**.

## Stack

- **Frontend:** Vanilla JS / HTML / CSS in `public/`
- **Endpoints:** Cloudflare Pages Functions in `functions/api/` (new) and Vercel serverless functions in `api/` (legacy)
- **Scraper:** Node.js script in `scripts/run-scrapers.js` invoked by `.github/workflows/scrape.yml`
- **Storage:** GitHub Gist (free, unlimited public reads, gist-scope PAT for writes)
- **Scraping:** Cheerio for HTML parsing; some scrapers are pattern-based (MTA, NYPD) and make no HTTP calls

## Scrapers (8)

| File | Sources | Notes |
|---|---|---|
| `lib/scrapers/city-council.js` | NYC Council | Legistar API primary; HTML fallback when API blocked |
| `lib/scrapers/mta.js` | MTA Board + committees | Pattern generator from `lib/data/mta-schedule.json` |
| `lib/scrapers/agencies.js` | DOB + DOE | HTML scraping |
| `lib/scrapers/community-boards.js` | 59 community boards × 5 boroughs | 10+ site types, one central `createMeeting()` |
| `lib/scrapers/oversight-boards.js` | CCRB, LPC, BSA, RGB | HTML scraping |
| `lib/scrapers/nyc-rules.js` | rules.cityofnewyork.us | Extracts `hearing_array` from JS |
| `lib/scrapers/city-government.js` | CPC, Comptroller, DCAS, Borough Presidents, DOB industry | Mixed scraping + pattern generation |
| `lib/scrapers/nypd.js` | 77 NYPD precincts | Pattern generator from `lib/data/nypd-precincts.json` |

Current production size: ~1,600 meetings, ~290 active orgs.

## Environment variables

### GitHub Actions secrets (scraper)
Set in https://github.com/FlashOfInsight/nyc-civic-calendar/settings/secrets/actions

| Name | Purpose |
|---|---|
| `GIST_ID` | ID of the Gist that stores meeting JSON |
| `GIST_GITHUB_TOKEN` | Classic PAT with `gist` scope. **Not named `GITHUB_TOKEN`** — that name is reserved by Actions for a repo-scoped token that cannot write user Gists. The workflow remaps this to `GITHUB_TOKEN` inside the scraper step. |
| `LEGISTAR_TOKEN` | NYC Council Legistar API read token |

### Cloudflare Pages environment variables (new endpoints)
Set in Cloudflare dashboard → Pages → `nyc-civic-calendar` → Settings → Environment variables

| Name | Type | Purpose |
|---|---|---|
| `GIST_ID` | Plain text | Same value as above |
| `REFRESH_SECRET` | Secret (encrypted) | Auth for `/api/debug` |

Compatibility flag **`nodejs_compat`** must be enabled (Production *and* Preview) so `process.env` and `Buffer` work in Functions.

### Vercel environment variables (legacy)
Still present, untouched. `GITHUB_TOKEN` in Vercel is expired but harmless since Vercel's cron is disabled. All Vercel env vars get deleted when the project is decommissioned on 2026-06-30.

## Common operations

**Trigger scraper manually:**
```bash
gh workflow run scrape.yml --repo FlashOfInsight/nyc-civic-calendar
gh run list --workflow=scrape.yml --limit 1
gh run watch <run-id>
```

**Check debug endpoint:**
```bash
curl "https://nycciviccalendar.com/api/debug?secret=$REFRESH_SECRET"
```

**Check Gist freshness:**
```bash
curl -sS "https://gist.githubusercontent.com/FlashOfInsight/<GIST_ID>/raw/city-council.json?t=$(date +%s)" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('last:', d['lastUpdated'], 'count:', len(d['meetings']))"
```

**Test ICS endpoint:**
```bash
# New (clean):
curl "https://nycciviccalendar.com/api/calendar.ics?orgs=city-council.stated" | head -30
# Legacy (with migration prefix):
curl "https://nyc-civic-calendar.vercel.app/api/calendar.ics?orgs=city-council.stated" | head -30
```

**Local dev of scrapers:**
```bash
cd ~/nyc-civic-calendar
npm install
# Pull env from Vercel (still has GIST_ID, LEGISTAR_TOKEN):
vercel env pull .env.vercel --environment production --yes
set -a; . ./.env.vercel; set +a
node scripts/run-scrapers.js     # writes to the real Gist
rm .env.vercel
```

## Project structure

```
nyc-civic-calendar/
├── public/                      # Static frontend (served by both Pages and Vercel)
│   ├── index.html               #   Has migration banner, hidden on new domain
│   ├── app.js
│   ├── styles.css               #   CSS rule hides banner when data-host matches
│   └── _headers                 #   Cloudflare Pages cache-control rules
├── functions/api/               # Cloudflare Pages Functions (new primary)
│   ├── calendar.ics.js          #   Clean ICS, no migration prefix
│   ├── active-orgs.js
│   └── debug.js
├── api/                         # Vercel serverless functions (legacy, grace period)
│   ├── calendar.ics.js          #   Opts into { migrationPrefix: true }
│   ├── active-orgs.js
│   ├── debug.js
│   └── cron.js                  #   No longer invoked (Vercel cron disabled)
├── scripts/
│   └── run-scrapers.js          # CLI version of the old api/cron.js
├── lib/
│   ├── gist-storage.js          # Reads env at call time (Node + Workers compat)
│   ├── ics-generator.js         # generateICS(meetings, name, { migrationPrefix })
│   ├── organizations.js         # Org hierarchy for the frontend
│   ├── scrapers/                # The 8 scrapers above
│   └── data/                    # Static pattern data (MTA, NYPD)
├── .github/workflows/
│   └── scrape.yml               # Daily cron, runs scripts/run-scrapers.js
├── vercel.json                  # Headers + function config (crons removed)
├── BUGS.md                      # Low-priority known issues
├── DEVELOPMENT_STATUS.md        # Historical migration log
└── README.md                    # This file
```

## Known issues

See `BUGS.md`. All medium+ bugs are fixed; the remaining low-priority items are non-urgent (hardcoded DOB locations, 3 NYPD precincts with moderate-confidence schedules, no holiday handling, CC HTML fallback scrapes only current year, duplicated scraper utils).

## Decommission checklist (execute on/after 2026-06-30)

When the 60-day grace period ends:

1. Delete the Vercel project (`vercel projects remove nyc-civic-calendar`)
2. Remove these from the repo:
   - `api/` directory (all legacy endpoints)
   - `vercel.json`
   - Vercel Analytics `<script>` + `window.va` setup in `public/index.html`
   - Migration banner `<section class="migration-banner">` in `public/index.html`
   - `.migration-banner` CSS rules in `public/styles.css`
   - `document.documentElement.dataset.host` JS line (now unused)
   - `MIGRATION_NOTICE_TEXT` and `migrationPrefix` option in `lib/ics-generator.js`
3. Commit + push; Cloudflare redeploys the cleaned-up site

## Adding a new scraper

1. Add the org hierarchy to `lib/organizations.js` and mirror in `public/app.js`
2. Create `lib/scrapers/your-source.js` exporting an async function that returns `Array<Meeting>`
3. Meeting shape: `{ id, org, title, date, time, endTime?, location, description?, url?, agendaUrl? }`
4. Wire it into `scripts/run-scrapers.js` — add import, add to `Promise.allSettled`, add results handling, add to `MIN_EXPECTED_MEETINGS`
5. Test: `gh workflow run scrape.yml` then check the Gist

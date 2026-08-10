# NYC Civic Calendar

Subscribe to a personalized ICS calendar feed of NYC government meetings — pick the bodies you care about, get a URL, add it to your calendar app.

**Live:** https://nycciviccalendar.com

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
                        ▼
              ┌───────────────────┐
              │ Cloudflare Pages  │
              │ nycciviccalendar  │
              │      .com         │
              │                   │
              │ /api/calendar.ics │
              │ /api/active-orgs  │
              │ /api/debug        │
              └───────────────────┘
```

The site migrated off Vercel on 2026-04-23 following Vercel's security incident (our data was not affected — the move was proactive) and the legacy Vercel deployment was fully decommissioned on 2026-08-10.

## Stack

- **Frontend:** Vanilla JS / HTML / CSS in `public/`
- **Endpoints:** Cloudflare Pages Functions in `functions/api/`
- **Scraper:** Node.js script in `scripts/run-scrapers.js` invoked by `.github/workflows/scrape.yml`
- **Storage:** GitHub Gist (free, unlimited public reads, gist-scope PAT for writes)
- **Scraping:** Cheerio for HTML parsing; `pdf-parse` v2 for PDF text extraction; some scrapers are pattern-based (MTA, NYPD) and make no HTTP calls

## Scrapers (8)

| File | Sources | Notes |
|---|---|---|
| `lib/scrapers/city-council.js` | NYC Council | Legistar API primary; HTML fallback when API blocked |
| `lib/scrapers/mta.js` | MTA Board + committees | Pattern generator from `lib/data/mta-schedule.json` |
| `lib/scrapers/agencies.js` | DOB + DOE | HTML scraping |
| `lib/scrapers/community-boards.js` | 59 community boards × 5 boroughs | 20+ scraper types; see [COMMUNITY-BOARD-SCRAPERS.md](COMMUNITY-BOARD-SCRAPERS.md) |
| `lib/scrapers/oversight-boards.js` | CCRB, LPC, BSA, RGB | HTML scraping |
| `lib/scrapers/nyc-rules.js` | rules.cityofnewyork.us | Extracts `hearing_array` from JS |
| `lib/scrapers/city-government.js` | CPC, Comptroller, DCAS, Borough Presidents, DOB industry | Mixed scraping + pattern generation |
| `lib/scrapers/nypd.js` | 77 NYPD precincts | Pattern generator from `lib/data/nypd-precincts.json` |

Current production size: ~1,800+ meetings, ~300 active orgs.

See **[COMMUNITY-BOARD-SCRAPERS.md](COMMUNITY-BOARD-SCRAPERS.md)** for the full per-board breakdown — data sources, scraper types, and live vs. estimated status for all 59 boards.

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
curl "https://nycciviccalendar.com/api/calendar.ics?orgs=city-council.stated" | head -30
```

**Local dev of scrapers:**
```bash
cd ~/nyc-civic-calendar
npm install
# Set GIST_ID, GIST_GITHUB_TOKEN (as GITHUB_TOKEN), LEGISTAR_TOKEN in your shell env
node scripts/run-scrapers.js     # writes to the real Gist
```

## Elections tab

A second tab at `/elections` serves the **2026 NYS Political Calendar** (71 events sourced from the NYS Board of Elections, revised 2025-12-09). Users select individual dates and get a bitmask-encoded ICS subscription URL.

- **Data:** `lib/data/political-calendar-2026.js` — 71 events with date, endDate (for multi-day bars), label, legalText, citation, category, election (primary/general), audience (voter/candidate/both)
- **Frontend:** `public/elections.js` — self-contained calendar grid renderer, filter toggles (audience + election type), select/clear, ICS URL builder. `public/elections/index.html` is a tiny hash-redirect shim so `nycciviccalendar.com/elections` opens the tab directly.
- **ICS endpoint:** `functions/api/elections.ics.js` — decodes `?e=<base64url-bitmask>`, returns a valid VCALENDAR with one VEVENT per selected date. Each event links to `https://elections.ny.gov/`.
- **Desktop layout:** weekly grid with multi-day bars (bleeds to cell edges), 1px day separators on bars, computed row height so bars don't inflate the grid.
- **Mobile layout:** 2-column horizontal scroll-snap, auto-scrolls to today on load, ICS section floats above the calendar.
- **URL routing:** `nycciviccalendar.com/elections` → 308 to `/elections/` → `elections/index.html` → `location.replace('/#elections')` → main app reads `location.hash` in `initTabs()` → activates elections tab, then `history.replaceState` cleans URL to `/elections`.

## UI — Org tree

The org tree in `public/app.js` is built from `const organizations = { ... }` (mirrored from `lib/organizations.js`). Each community board entry supports two optional properties:

- **`url`** — shown as a small gray `↗` link next to the board name, pointing to the live data source. Set on all boards where we have a known website.
- **`estimated: true`** — shown as a red `*` asterisk with tooltip "Dates are estimated from a typical schedule — verify at the official website". Set on the ~12 boards that use pattern-only fallback schedules.

## Project structure

```
nyc-civic-calendar/
├── public/                      # Static frontend, served by Cloudflare Pages
│   ├── index.html               #   Two-tab SPA
│   ├── app.js                   #   Meetings tab: org tree, ICS URL builder, stats
│   ├── elections.js             #   Elections tab: calendar grid, filters, ICS builder
│   ├── styles.css               #   Shared styles; mobile breakpoint at 640px
│   ├── elections/
│   │   └── index.html           #   Hash-redirect shim for /elections URL routing
│   └── _headers                 #   Cloudflare Pages cache-control rules
├── functions/api/               # Cloudflare Pages Functions
│   ├── calendar.ics.js          #   Meetings ICS
│   ├── elections.ics.js         #   Elections ICS: bitmask-encoded ?e= param
│   ├── active-orgs.js
│   └── debug.js
├── scripts/
│   └── run-scrapers.js          # Daily scraper runner, invoked by GitHub Actions
├── lib/
│   ├── gist-storage.js          # Reads env at call time (Node + Workers compat)
│   ├── ics-generator.js         # generateICS(meetings, name)
│   ├── organizations.js         # Org hierarchy for the server-side ICS generator
│   ├── scraper-utils.js         # Shared fetchHTML/parseMonth/formatDate/getNthWeekday/isInRange
│   ├── scrapers/                # The 8 scrapers above
│   └── data/
│       ├── mta-schedule.json    #   MTA meeting pattern data
│       ├── nypd-precincts.json  #   77 NYPD precinct schedules
│       └── political-calendar-2026.js  # 71 NYS BOE election dates
├── .github/workflows/
│   └── scrape.yml               # Daily cron at 6 AM UTC, runs scripts/run-scrapers.js
├── BUGS.md                      # Low-priority known issues
├── COMMUNITY-BOARD-SCRAPERS.md  # Per-board scraper status and data sources
├── DEVELOPMENT_STATUS.md        # Historical change log
└── README.md                    # This file
```

## Known issues

See `BUGS.md`. All medium+ bugs are fixed; the remaining low-priority items are non-urgent (hardcoded DOB locations, 3 NYPD precincts with moderate-confidence schedules, no holiday handling for pattern-based scrapers, CC HTML fallback scrapes only current year, duplicated scraper utility functions).

## Adding a new community board scraper

1. Determine the board's data source (see [COMMUNITY-BOARD-SCRAPERS.md](COMMUNITY-BOARD-SCRAPERS.md) for examples of each type)
2. Add a new `type` string to the board entry in `BROOKLYN_BOARDS` / `QUEENS_BOARDS` / etc. at the top of `lib/scrapers/community-boards.js`
3. Write a scraper function that returns `Meeting[]` using the shared `createMeeting()` helper
4. Add a `case` for your type in the relevant `scrapeBrooklynCBs()` / `scrapeQueensCBs()` / etc. switch statement
5. Add `url` to the board's entry in `public/app.js` organizations data
6. Run `gh workflow run scrape.yml --repo FlashOfInsight/nyc-civic-calendar` to populate the Gist

## Adding a new non-CB scraper

1. Add the org hierarchy to `lib/organizations.js` and mirror in `public/app.js`
2. Create `lib/scrapers/your-source.js` exporting an async function that returns `Array<Meeting>`
3. Meeting shape: `{ id, org, title, date, time, endTime?, location, description?, url?, agendaUrl? }`
4. Wire it into `scripts/run-scrapers.js` — add import, add to `Promise.allSettled`, add results handling, add to `MIN_EXPECTED_MEETINGS`
5. Test: `gh workflow run scrape.yml` then check the Gist

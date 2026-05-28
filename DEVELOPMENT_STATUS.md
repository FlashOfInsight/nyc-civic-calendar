# Development Status

Historical log of major changes. For current architecture, env vars, and operations, see `README.md`.

---

## 2026-05-27/28 — Elections tab + UX polish

### Elections tab (new)
Added a full 2026 NYS Political Calendar tab. Data is 71 events from the NYS Board of Elections (revised 2025-12-09) stored in `lib/data/political-calendar-2026.js`. Each event has date, optional endDate, label, legalText, citation, category, election (primary/general/both), and audience (voter/candidate/both).

Frontend (`public/elections.js`):
- Weekly calendar grid with multi-day event bars (bleed technique: `width: calc(100% + 6px); margin: 0 -3px`) and 1px day separators between bar segments
- Row height computed from actual event counts (20px bars, 17px chips, 2px gaps, 6px padding) so rows are compact instead of padded for worst-case
- Audience toggle (all/voter/candidate) and election toggle (all/primary/general)
- Select all visible / clear all visible bulk actions
- Bitmask-encoded ICS URL: each of the 71 events maps to a bit; URL-safe base64 encodes the byte array
- Mobile layout: 2-column horizontal scroll-snap (`scroll-snap-type: x mandatory`), 65vh height, auto-scrolls to today on load via `requestAnimationFrame` + `scrollIntoView`

ICS endpoint (`functions/api/elections.ics.js`):
- Decodes `?e=<base64url>` bitmask, returns RFC 5545 VCALENDAR
- Each VEVENT includes DTSTART/DTEND (all-day), SUMMARY, DESCRIPTION (legalText + citation + source), CATEGORIES, URL (elections.ny.gov)
- Proper RFC 5545 line folding at 75 octets

### URL routing
`nycciviccalendar.com/elections` now opens the elections tab directly. Implementation: `public/elections/index.html` is a tiny shim that does `location.replace('/#elections')`. Main app's `initTabs()` reads `location.hash === "#elections"` and activates the tab, then `history.replaceState` cleans the URL to `/elections`. Previous approach (sessionStorage) was abandoned because it fails with stricter browser privacy settings.

### Meetings tab UX
- Generated calendar URL box moved to top of the tab (above HOW IT WORKS)
- Per-app instructions (Google/Apple/Outlook) collapsed behind `<details class="app-instructions">` toggle; HOW IT WORKS section stays visible
- Meetings tab uses `display: flex; flex-direction: column; gap: var(--space-lg)` via `#tab-meetings:not([hidden])` — the `:not([hidden])` is required to avoid `display: flex` overriding the `hidden` attribute and bleeding the meetings tab into the elections tab view
- Org row header padding and instruction list spacing increased for readability

Commits: `dea5aed` through `1d73c2b`.

---

## 2026-04-23 — Migrated off Vercel

Following Vercel's security incident (our data was not affected — proactive move), the app was migrated to a split architecture:

- **Scraper**: Vercel Cron → **GitHub Actions** (`.github/workflows/scrape.yml` + `scripts/run-scrapers.js`)
- **Frontend + endpoints**: Vercel serverless → **Cloudflare Pages + Functions** (`functions/api/*`)
- **Domain**: new custom domain `nycciviccalendar.com` (registered at Cloudflare, ~$10/yr)
- **Legacy Vercel URL** (`nyc-civic-calendar.vercel.app`) continues serving with a migration notice injected into every ICS event description and a banner on the landing page. **Grace period ends 2026-06-30.**

Commits:
- `ca6ff9b` GitHub Actions workflow + standalone scraper script
- `ccb0d91` Migration notices (landing banner + ICS event prefix)
- `da4a870` Cloudflare Pages Functions + runtime-neutral gist-storage refactor + `public/_headers`
- `4d3412f` Hide migration banner on the new domain via `data-host` JS + CSS
- `70d4710` Disable Vercel cron in `vercel.json`

Side effect: the pre-existing Vercel `GITHUB_TOKEN` was already expired (10 days of silent Gist-write failures before migration caught it). Fresh PAT with `gist` scope created and stored as `GIST_GITHUB_TOKEN` in GitHub Actions secrets.

---

## 2026-03-16 / 17 — Stability audit + medium-priority bug fixes

15-bug stability audit across 11 files. Fixed: HTTP timeouts missing on scrapers, non-deterministic ICS UIDs, crash on missing `meeting.org`, debug endpoint exposing stack traces, `parseTime` bug for evening times, manhattan CB summer-skip, sequential Gist reads, RFC 5545 line folding, active orgs unbounded growth, frontend/backend org hierarchy drift, dead `ics` npm dep. Then filtered deferred/recessed/postponed/cancelled City Council meetings.

Production state post-audit: 1,671 meetings, 301 active orgs, 8 scrapers healthy.

---

## 2026-03-13 / 14 — Phase 2 completion + CC Legistar rewrite

Rewrote City Council scraper to use Legistar API with HTML fallback (API blocked from Vercel IPs), standardized CC/CB names (`CC [Committee]`, `CB [borough][number]`), added livestream + agenda links to every CC event, fixed ICS timezone, fixed LPC phantom Tuesdays, added all 77 NYPD precincts. CB6 scraper rewritten for committee name extraction. Cron switched to full-replace on successful scrape (prevents stale data).

---

## 2026-01-20 — Phase 2 scrapers + storage migration

Added City Planning Commission, Comptroller Investment, DCAS Hearings, Brooklyn Borough President, DOB (Buildings After Hours + 5-borough Industry Meetings). Migrated storage from Vercel Blob (operation limits hit) to GitHub Gist (unlimited free reads). Fixed cron auth for Vercel Hobby plan. Changed cron from weekly to daily at 6 AM UTC.

Post-Phase-2 state: 1,109 meetings, 193 active orgs.

---

## Phase 1 — original build

City Council (initial version), MTA Board, DOB, DOE, 59 Community Boards, CCRB, LPC, BSA, RGB, NYC Rules.

---

## Phase 3 — not started

Possible future additions:
- NYCEDC board entities (IDA, Build NYC)
- DOE Citywide Councils (CCHS, CCSE, CCD75, CCELL)
- DOE Community Education Councils (32 districts)
- NYC Water Board
- IBO Advisory Board
- NYCHDC

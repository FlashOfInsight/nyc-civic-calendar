# Development Status

Historical log of major changes. For current architecture, env vars, and operations, see `README.md`.

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

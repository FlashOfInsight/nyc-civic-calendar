# NYC Civic Calendar — Bug Tracker

Last reviewed: November 15, 2026

## Fixed (November 15, 2026) — monthly maintenance

- ~~Queens CB14 always on estimated dates~~ — The board lists its full-board dates as "December 8th, 2026"; the Queens nyc.gov date pattern didn't allow "st/nd/rd/th", so every date was skipped. Fixed; a "Full Board / …" section heading is now named "Full Board Meeting" (also renames Queens CB1's six full-board entries, same dates and times). Queens CB14 0 → 1 real meeting (the rest of 2026's list is past; 2027 not posted yet).
- MTA: mta.info lists nothing after December 16, 2026 yet; `mta-schedule.json` unchanged. The health check will start warning about it ~November 16.

## Fixed (November 15, 2026) — bug-list pass

- ~~City Planning Commission dates were guessed~~ (was #14) — The every-other-Wednesday guess was a week off (it showed Nov 25; the real meetings are Nov 18 and Dec 2). `scrapeCPC` now reads the JSON file behind the department's calendar page: Commission public meetings and review sessions with real times, plus scoping meetings and information sessions under a new "Scoping Meetings & Information Sessions" entry. The department posts about a month ahead; nothing is guessed beyond that.
- ~~Estimated meetings landed on holidays~~ (was #8) — The cleanup pass drops estimated meetings (pattern-only boards and all NYPD precinct councils) that fall on a federal holiday, the day after Thanksgiving, Dec 24 or Dec 31. NYPD meetings are now flagged `estimated` and say so.
- ~~Queens CB1 meeting times off by 30 minutes~~ (was #17) — The Queens nyc.gov reader took the first time anywhere in a list of dates. It now uses a time only when it follows that date, otherwise the page's stated usual time (6:30 PM). Also reads dates written without a space ("November 24,2026").
- ~~`lib/organizations.js` unused~~ (was #15) — Deleted.

## Fixed (November 15, 2026) — long-term stability audit

- ~~Gist token expired again (daily run failed Nov 9–15)~~ — Replaced with a gist-only token that has no expiration.
- ~~MTA showed no meetings since June~~ — `lib/data/mta-schedule.json` only ran through June 2026. Added July–December 2026. mta.info blocks scrapers, so this file is still hand-maintained; the health check now warns 30 days before it runs out.
- ~~Recurring calendar events were dropped~~ — The Google Calendar reader only looked at each event's first date, so "Land Use, 2nd Wednesday" entered as a repeating event vanished after its first meeting. New `lib/ics-reader.js` expands repeats and honours skipped/moved dates. Manhattan CB9 3 → 74 meetings, Brooklyn CB3 7 → 73, Brooklyn CB8 6 → 59, Queens CB2 8 → 59.
- ~~Impossible dates ("2026-12-00")~~ — The old UTC→Eastern conversion subtracted a day by hand. Now done with the system time-zone database.
- ~~Manhattan CB7 missing entirely~~ — mcb7.org changed its data format and the bundle regex stopped matching (no fallback, so 0 meetings). Now reads the public Google Calendar the site is built from.
- ~~Manhattan CB12 missing entirely~~ — The board moved to cb12m.org. Now reads the site's own subscribe feed (`/api/calendar`).
- ~~Brooklyn CB2 on estimated dates~~ — Its calendar page now embeds a Google Calendar; reads that.
- ~~Manhattan CB2/CB4/CB10, Brooklyn CB7/CB10/CB17 scraped from page HTML~~ — Switched to the sites' events API (`scrapeTribeREST`). Fixes wrong years (Brooklyn CB10/CB17 showed Nov–Dec 2027 dates), 27 duplicate entries, and one-page limits (Manhattan CB10 34 → 71).
- ~~Brooklyn CB5 hardcoded~~ — Now reads the board's Google Calendar; the hardcoded schedule is the fallback.
- ~~Bronx CB10 silently on estimated dates~~ — The agenda PDF's filename changes month to month; the scraper now finds the link on the calendar page.
- ~~Cancelled meetings listed~~ — One cleanup pass (`lib/health.js` `sanitizeMeetings`) now drops cancelled/postponed meetings, holidays, duplicates and invalid dates from every source.
- ~~81 meetings couldn't be selected on the website~~ — Scrapers produced committee keys (e.g. `licensing` for Manhattan CB2) that weren't in the site's list. `public/app.js` now adds any scraped key it doesn't know under its board.
- ~~Unrecognised committees filed under "Full Board"~~ — They now go to an "Other Committees" entry per board.
- ~~Estimated dates looked like real ones~~ — Pattern-generated meetings carry `estimated: true` and a note in the calendar entry.
- ~~Silent breakage~~ — Every run writes a health report (`health.json`, served at `/api/health`). A board or agency that had real data and has had none for 35 days, or hand-entered data within 30 days of running out, is emailed once. A source that goes quiet keeps its last real upcoming meetings for 21 days instead of dropping to estimates.
- ~~Year-stamped Rent Guidelines Board URL~~ — Built from the current year.

## Fixed (October 12, 2026)

- ~~Daily scrape silently stopped~~ — GitHub disabled `scrape.yml` for 60 days of repo inactivity (`disabled_inactivity`); failure email can't fire when no run happens. Added a "Keep schedule alive" step that calls the workflow-enable API each run.
- ~~City Council HTML fallback showed deferred hearings and only the current month~~ — Two bugs, live in production since the Legistar API started 403ing from Actions (~2026-07-15). Both bugs are fixed, and the fallback still covers future API outages. (a) Status was read from column 2 (the iCal icon); Legistar puts "Deferred" in the time column, so nothing was ever filtered — this regressed the March 16 Bug #3 fix. (b) `?Mode=List&Year=YYYY` narrows the page to the current month; the bare URL returns the full session (newest first, 100 rows). Fallback now matches the API exactly (49 upcoming meetings on 2026-10-12). Also fixes former #9 (year rollover).
- ~~Bronx CB6/CB8 always on pattern fallback~~ — `/calendar/YYYY-MM/` URLs 404 (the page is a shortcode, not the Tribe archive). Switched `scrapeCBBronx` to the Tribe REST API; deduped CB8's repeated rows.
- ~~Bronx BP 404~~ — Site moved from WordPress to Revize CMS; now reads the Revize calendar JSON handler. (The BP office hasn't posted an event since May 2026, so this returns 0 for now.)
- ~~Legistar API 403 in Actions since ~2026-07-15~~ — The `LEGISTAR_TOKEN` Actions secret held a different key from `.env.local` that Legistar stopped accepting. Re-set it from `.env.local`; API path works again (106 meetings).
- ~~Manhattan CB8 blocked from GitHub Actions~~ — cb8m.com's Cloudflare bot check challenges Actions runners. A Pages Function relay was challenged too. Diagnostics: cb8m sees Cloudflare's Workers IP `2a06:98c0:3600::103` either way, but challenges it via LAX (where Actions lands) and not via EWR. Headers and the original caller made no difference. Fix: the standalone `workers/cb8m-relay` Worker fetches from a Durable Object created with `locationHint: "enam"`. Tested from an Actions runner: 8/8 nodes (IAD/EWR/ATL) got 200, and the relay returned 27 events. Fallback schedule also corrected from CB8's real 2026 calendar (13/15 Oct–Dec dates).
- ~~Manhattan CB5 showed 0 meetings~~ — `cb5-rest` had no pattern fallback; now uses `generateCB5Meetings()` (6 committees) when blocked.
- ~~QN CB10 / BK CB13 / SI CB2 404 every run, events linked to 404 pages~~ — Calendar pages removed from nyc.gov. New `pattern` board type skips the fetch; `url` points at a live page.

## Fixed (August 10, 2026)

- ~~Duplicated utility functions across scrapers~~ — `fetchHTML`, `parseMonth`, `formatDate`, `getNthWeekday`, and `isInRange` were copy-pasted (with drift) across 7 files. Extracted to `lib/scraper-utils.js`; `city-council.js` and `community-boards.js` keep thin local wrappers for their custom headers/User-Agent. Also fixed two latent bugs surfaced during consolidation: three files never drained the response body on non-2xx (potential socket leak), and `agencies.js` had a dead, never-called `getNthWeekday`.

## Fixed (March 13, 2026)

- ~~City Council scraper only getting 12 meetings~~ — Rewrote to use Legistar API with HTML fallback (now 77-140 meetings)
- ~~City Council meeting names not standardized~~ — All now use "CC [Committee]" format
- ~~Community Board names not standardized~~ — All now use "CB [borough abbrev][number] [type]" format
- ~~ICS timezone not applied to events~~ — DTSTART/DTEND now use TZID=America/New_York
- ~~LPC phantom Tuesday meetings~~ — Now uses actual dates from LPC page, falls back to all-Tuesdays only if none found
- ~~NYPD precincts missing meeting patterns~~ — All 11 precincts researched and added (77/77 now active)
- ~~All-day event DTEND same as DTSTART~~ — Now correctly sets DTEND to next day per RFC 5545
- ~~Agencies scraper missing HTTP status check~~ — Now rejects on non-200 responses instead of silently returning bad HTML

## Fixed (March 14, 2026)

- ~~CB6 meetings showing as "Committee Meeting" without prefix~~ — Rewrote `scrapeCB6()` to walk DOM in order, track headings, extract committee names
- ~~Stale meeting data persisting after scraper changes~~ — Cron now does full replace (not merge) when scraper returns good data

## Fixed (March 16, 2026) — Stability audit

- ~~DOB Industry Meetings duplicated~~ — Was generated in both agencies.js and city-government.js; removed from agencies.js
- ~~CB dedup checks comparing incompatible strings~~ — Raw title vs display title never matched; switched to Set-based dedup in 9 scrapers
- ~~parseTime wrong for evening times without AM/PM~~ — "6:30" was treated as 6:30 AM; now assumes PM for hours 1-7
- ~~ICS endpoint crash on missing meeting.org~~ — Added null check in filterMeetings
- ~~Non-deterministic ICS UIDs~~ — Removed Date.now() from fallback UID; calendar apps no longer see duplicate events
- ~~No HTTP timeouts on any scraper~~ — Added 15-second timeout to all 7 scrapers
- ~~No redirect depth limit~~ — Added max 5 redirects to all fetchHTML functions
- ~~Manhattan recurring meetings not skipping summer~~ — Now skips July/August like other boroughs
- ~~scrapeCBManhattan no past-date filtering~~ — Added future-date check and midnight normalization
- ~~NYPD missing from cron response~~ — Added nypd entry to results JSON
- ~~Sequential Gist reads in ICS endpoint~~ — Parallelized with Promise.all (8x faster)
- ~~Debug endpoint exposed stack traces with no auth~~ — Added secret auth, removed stack traces
- ~~CB borough abbreviations not standardized~~ — Now uses M, Bx, Bk, Qn, SI across all boards
- ~~Redundant CB# prefixes in titles~~ — Strips "CB2:", "CB17 CB17" etc. from source titles
- ~~Navigation text scraped as meeting titles~~ — Filtered out "SelectMonthly", "Share Print" etc.

## Fixed (March 16, 2026) — Bug #3

- ~~Deferred City Council meetings showing as all-day events~~ — Now filters meetings with status "deferred", "recessed", "postponed", or "cancelled" in both API path (`EventAgendaStatusName`) and HTML fallback (status column). API: 113 kept, 30 filtered. HTML fallback: 77 kept.

## Fixed (March 16, 2026) — Medium priority bugs

- ~~ICS lines not folded per RFC 5545~~ — Added `foldLine()` to ICS generator; all content lines now <=75 octets with CRLF+space continuation
- ~~Active orgs list grows unboundedly~~ — Full replace when all scrapers succeed; merge-with-existing only when some fail
- ~~Organization hierarchy drift~~ — Added 7 missing agencies to frontend: DCWP, DEP, SBS, DFTA, ACS, DSS, Other
- ~~Unused `ics` npm dependency~~ — Removed (npm uninstall)

## Still Active

### Low Priority

### 1. DOB industry meeting locations are hardcoded
Five borough office addresses in `lib/scrapers/city-government.js` are static strings.
- **Action:** Check quarterly or parse from DOB website

### 2. NYPD precincts with moderate confidence schedules
Three precincts (46th, 50th, 52nd) had conflicting schedule info.
- **File:** `lib/data/nypd-precincts.json`
- **Action:** Confirm at next community council meeting or contact precincts

### 11. Manhattan CB5 blocked by Cloudflare
`cb5.org` 403s every scripted request, even from residential IPs, and the Pages Function relay (see CB8) doesn't help. On pattern fallback; marked `estimated` in the UI.
- **Action:** Look for an alternate feed, or ask the board to exempt `/wp-json/` from bot protection

### 13. Hand-maintained data
- `lib/data/mta-schedule.json` — add each new set of MTA dates (the site blocks scrapers). The health check emails 30 days before it runs out.
- `lib/data/political-calendar-2026.js` — the Elections tab is the 2026 NYS calendar; a 2027 calendar is a new file plus a year switch.
- Brooklyn CB1 and Queens CB8 read annual schedule PDFs with the year in the URL (`Press-Release-2026-2027.pdf`, `2026-Board-Meeting-Date.pdf`). When those run dry the health check flags the board as dark.

### 16. Queens CB3 blocked by a captcha on some requests
`queenscb3.cityofnewyork.us` (SiteGround) answers some scripted requests with HTTP 202 and a redirect to `/.well-known/sgcaptcha/`. The events API itself is fine and lists monthly meetings through June 2027. When a run gets through, the real dates are kept for 21 days (carry-over), so the board only drops to estimated dates if it is blocked for three weeks straight. Not worked around on purpose (no bot-check evasion).
- **Action (owner):** ask the board or its web host to exempt `/wp-json/tribe/events/` from the bot check, or route through a relay like CB8's if the board agrees.


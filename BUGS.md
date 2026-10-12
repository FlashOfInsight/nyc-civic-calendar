# NYC Civic Calendar — Bug Tracker

Last reviewed: October 12, 2026

## Fixed (October 12, 2026)

- ~~Daily scrape silently stopped~~ — GitHub disabled `scrape.yml` for 60 days of repo inactivity (`disabled_inactivity`); failure email can't fire when no run happens. Added a "Keep schedule alive" step that calls the workflow-enable API each run.
- ~~City Council HTML fallback showed deferred hearings and only the current month~~ — Two bugs, live in production since the Legistar API started 403ing from Actions (~2026-07-15). Both bugs are fixed, and the fallback still covers future API outages. (a) Status was read from column 2 (the iCal icon); Legistar puts "Deferred" in the time column, so nothing was ever filtered — this regressed the March 16 Bug #3 fix. (b) `?Mode=List&Year=YYYY` narrows the page to the current month; the bare URL returns the full session (newest first, 100 rows). Fallback now matches the API exactly (49 upcoming meetings on 2026-10-12). Also fixes former #9 (year rollover).
- ~~Bronx CB6/CB8 always on pattern fallback~~ — `/calendar/YYYY-MM/` URLs 404 (the page is a shortcode, not the Tribe archive). Switched `scrapeCBBronx` to the Tribe REST API; deduped CB8's repeated rows.
- ~~Bronx BP 404~~ — Site moved from WordPress to Revize CMS; now reads the Revize calendar JSON handler. (The BP office hasn't posted an event since May 2026, so this returns 0 for now.)
- ~~Legistar API 403 in Actions since ~2026-07-15~~ — The `LEGISTAR_TOKEN` Actions secret held a different key from `.env.local` that Legistar stopped accepting. Re-set it from `.env.local`; API path works again (106 meetings).
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

### 8. NYPD and pattern-based scrapers have no holiday handling
Generated meetings appear on holidays (MLK Day, Thanksgiving, etc.) when they almost certainly won't happen.
- **Action:** Add a holiday calendar and skip those dates

### 12. Manhattan CB8 blocked from GitHub Actions
cb8m.com's Cloudflare bot check challenges Actions runner IPs (works from residential IPs). Tried a Pages Function relay (`functions/api/cb8m-events.js`): it gets through when called from a residential IP, but when called from Actions its upstream fetch is challenged too (tried both the custom domain and the pages.dev host). Production is on the pattern fallback; marked `estimated`.
- **Ideas:** add diagnostics to the relay (colo, upstream status) to see what differs; or ask CB8 to exempt `/wp-json/` from bot protection

### 11. Manhattan CB5 blocked by Cloudflare
`cb5.org` 403s every scripted request, even from residential IPs, and the Pages Function relay (see CB8) doesn't help. On pattern fallback; marked `estimated` in the UI.
- **Action:** Look for an alternate feed, or ask the board to exempt `/wp-json/` from bot protection

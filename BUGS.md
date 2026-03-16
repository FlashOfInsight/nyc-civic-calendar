# NYC Civic Calendar — Bug Tracker

Last reviewed: March 16, 2026

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

### 9. City Council HTML fallback only scrapes current year
In late December, January meetings won't appear from the HTML fallback scraper.
- **File:** `lib/scrapers/city-council.js`
- **Action:** Scrape next year's page when current month >= November

### 10. Duplicated utility functions across scrapers
`parseMonth`, `formatDate`, `fetchHTML`, `getNthWeekday` are copy-pasted across 7 files.
- **Action:** Extract to a shared `lib/scraper-utils.js` module

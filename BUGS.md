# NYC Civic Calendar — Bug Tracker

Last reviewed: March 13, 2026

## Fixed (this session)

- ~~City Council scraper only getting 12 meetings~~ — Rewrote to use Legistar API with HTML fallback (now 77-140 meetings)
- ~~City Council meeting names not standardized~~ — All now use "CC [Committee]" format
- ~~Community Board names not standardized~~ — All now use "CB [borough abbrev][number] [type]" format
- ~~ICS timezone not applied to events~~ — DTSTART/DTEND now use TZID=America/New_York
- ~~LPC phantom Tuesday meetings~~ — Now uses actual dates from LPC page, falls back to all-Tuesdays only if none found
- ~~NYPD precincts missing meeting patterns~~ — All 11 precincts researched and added (77/77 now active)
- ~~All-day event DTEND same as DTSTART~~ — Now correctly sets DTEND to next day per RFC 5545
- ~~Agencies scraper missing HTTP status check~~ — Now rejects on non-200 responses instead of silently returning bad HTML
- ~~Active orgs list never prunes~~ — Intentional design; orgs preserved across runs to avoid flicker
- ~~Stale meeting data persists~~ — filterFutureMeetings() in cron.js already drops meetings before yesterday
- ~~NYC Rules fragile regex~~ — Has proper try/catch and returns [] on failure

## Still Active

### Low Priority

### 1. DOB industry meeting locations are hardcoded
Five borough office addresses in `lib/scrapers/agencies.js` are static strings. Will show wrong locations if DOB moves offices.
- **File:** `lib/scrapers/agencies.js` (lines ~148-154)
- **Action:** Check quarterly or parse from DOB website

### 2. NYPD precincts with moderate confidence schedules
Three precincts (46th, 50th, 52nd) had conflicting schedule info across sources. Current patterns are based on the most recent/reliable sources but may need verification.
- **File:** `lib/data/nypd-precincts.json`
- **Action:** Confirm at next community council meeting or contact precincts

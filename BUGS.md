# NYC Civic Calendar — Active Bugs

Last reviewed: March 13, 2026

## Fixed
- ~~Active orgs list never prunes~~ — Intentional design; orgs preserved across runs to avoid flicker
- ~~Stale meeting data persists~~ — `filterFutureMeetings()` in cron.js drops meetings before yesterday
- ~~NYC Rules fragile regex~~ — Has proper try/catch and returns [] on failure

## Still Active

### High Priority

### 1. NYPD precincts missing meeting patterns
11 precincts have `weekOfMonth: null` in `lib/data/nypd-precincts.json` — the scraper skips them silently, so zero meetings are generated.
- **Affected:** Bronx 40-47, 50, 52; Staten Island 120
- **Files:** `lib/data/nypd-precincts.json`, `lib/scrapers/nypd.js`
- **Fix:** Research actual meeting schedules and add patterns

### 2. LPC scraper generates phantom Tuesday meetings
Code collects actual dates from the LPC page but never uses them — always generates every Tuesday at 9:30 AM for 6 months (27 phantom meetings). LPC does not meet every Tuesday.
- **File:** `lib/scrapers/oversight-boards.js` (lines ~174-211)
- **Fix:** Use the `foundDates` set that's already being parsed, fall back to all-Tuesdays only if no dates found

### 3. ICS timezone not applied to events
`VTIMEZONE` for America/New_York is defined in the calendar but `DTSTART` uses floating time (`20260313T093000`) without `TZID=America/New_York` prefix. Calendar apps ignore the timezone definition.
- **File:** `lib/ics-generator.js` (lines ~71-75, 141-145)
- **Fix:** Change `DTSTART:` to `DTSTART;TZID=America/New_York:` (same for DTEND)

### Low Priority

### 4. DOB industry meeting locations are hardcoded
Five borough office addresses in `lib/scrapers/agencies.js` are static strings. Will show wrong locations if DOB moves offices.
- **File:** `lib/scrapers/agencies.js` (lines ~148-154)
- **Fix:** Parse from DOB website if available, or add a note to check quarterly

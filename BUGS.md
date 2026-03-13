# NYC Civic Calendar — Active Bugs

Identified March 13, 2026 during codebase review.

## High Priority

### 1. NYPD precincts missing meeting patterns
~13 precincts have `weekOfMonth: null` in `lib/data/nypd-precincts.json` so no meetings are generated for them.
- **Affected:** Bronx 40-47, 50, 52; Staten Island 120
- **File:** `lib/data/nypd-precincts.json`, `lib/scrapers/nypd.js`
- **Fix:** Scrape or manually add meeting patterns for these precincts

### 2. Active orgs list never prunes stale entries
`api/cron.js` merges new active orgs but never removes old ones. If a scraper stops returning meetings for a committee, it stays visible in the UI indefinitely with zero events.
- **File:** `api/cron.js` (~line 191)
- **Fix:** Rebuild active-orgs from scratch each cron run instead of merging

### 3. Stale meeting data persists when scrapers return 0 results
Minimum threshold logic in `api/cron.js` preserves old data if a scraper returns fewer results than expected. Old meetings (potentially months past) can stick around.
- **File:** `api/cron.js`
- **Fix:** Add expiry dates — drop meetings older than X days regardless of scraper output

## Medium Priority

### 4. LPC scraper generates phantom Tuesday meetings
Assumes Landmarks Preservation Commission meets every Tuesday at 9:30 AM and generates future Tuesdays without validating the actual schedule.
- **File:** `lib/scrapers/oversight-boards.js`
- **Fix:** Scrape actual LPC calendar or add known skip-weeks

### 5. NYC Rules scraper depends on fragile regex
Parses meeting data by regex-matching `var hearing_array = [...]` from page source JS. Will silently break if the site changes its markup.
- **File:** `lib/scrapers/nyc-rules.js`
- **Fix:** Add fallback HTML/Cheerio parsing; add alerting on 0 results

### 6. DOB industry meeting locations are hardcoded
If DOB moves borough offices, the calendar will show wrong addresses.
- **File:** `lib/scrapers/agencies.js`
- **Fix:** Parse locations from DOB website if available

## Low Priority

### 7. ICS floating time format may confuse older calendar apps
Events use format `20260320T100000` without explicit TZID or UTC `Z` suffix. Most modern apps handle this fine; older Outlook versions may interpret as UTC.
- **File:** `lib/ics-generator.js`
- **Fix:** Add `VTIMEZONE` component for America/New_York and use `DTSTART;TZID=America/New_York:`

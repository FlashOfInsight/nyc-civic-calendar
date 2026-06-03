# Community Board Scraper Reference

Status as of **June 2026**. The single scraper file `lib/scrapers/community-boards.js` handles all 59 community boards across 5 boroughs. Each board has a `type` that selects its scraping strategy.

## Scraper Types

| Type | Strategy |
|---|---|
| `cb1m-rest` / `cb5-rest` / `cb6brooklyn-api` / `cb8m-rest` / `queens-cb6-gcal` etc. | Tribe Events REST API — `{site}/wp-json/tribe/events/v1/events` |
| `cbmanhattan` / `cbbrooklyn` / `cbbronx` | Tribe Events HTML — monthly URL pagination |
| `cbsix` / `nyc-gov-cb3` | Custom HTML scraper (h3/p structure) |
| `mcb7-bundle` | React/Vite JS bundle — fetch HTML, extract bundle URL, regex JSON objects |
| `cb9m-gcal` / `cb3brooklyn-gcal` / `queens-cb2-gcal` / `queens-cb6-gcal` / `queens-cb13-gcal` | Google Calendar public ICS feed via `scrapeGCalICS()` helper |
| `brooklyn-cb1-pdf` / `bronx-cb10-pdf` / `queens-cb8-pdf` | PDF text extraction via `pdf-parse` v2 |
| `brooklyn-cb4-js` / `brooklyn-cb18-js` / `queens-cb5-js` | Custom JS `calEvents` array (`"M/D/YYYY\|HTML\|\|0\|na\|"` format) |
| `brooklyn-cb9-csv` / `queens-cb4-csv` | CSV via shared `parseCSVRow()` helper |
| `brooklyn-cb5-generated` / `bronx-cb11-generated` / `bronx-cb12-generated` | Hardcoded recurring schedule from published board documents |
| `nyc-gov-queens` / `nyc-gov-bronx` | nyc.gov calendar pages — h2/h3 section tracking + `matchAll` for year-less dates |
| `queens-cb7-static` / `bronx-cb4-calendar` / `bronx-cb9-calendar` | Dedicated parsers for specific nyc.gov page formats |
| `nyc-gov` / `nyc-gov-cb1` / `nyc-gov-si` | Generic nyc.gov scraper — falls back to pattern when no data |

**Fallback mechanism:** If any scraper returns fewer than 2 meetings, a recurring pattern generator kicks in using hardcoded weekday/nth schedules. These are displayed in the UI with a red `*` marker.

**Shared helpers in `community-boards.js`:**
- `scrapeGCalICS(calIds, boardId, borough, boardUrl, titleFilter?, titleExclude?)` — fetches and parses ICS feeds; accepts plain IDs, `@group.calendar` addresses, or workspace emails
- `HOLIDAY_RE` — regex for filtering GCal feeds that mix holidays with meetings
- `parseCSVRow(line)` — RFC 4180 CSV parser
- `titleCaseCommittee(str)` / `isPDFCommitteeHeader(line)` — PDF parsing helpers
- `fetchBuffer(url)` — binary buffer fetch (retained for future use)

---

## Status by Board

### Manhattan (11 live, 1 estimated)

| Board | Neighborhoods | Type | Source | Status |
|---|---|---|---|---|
| CB1 | Financial District, Battery Park City, Tribeca | `cb1m-rest` | `manhattancb1.cityofnewyork.us` Tribe REST | ✅ 23 events |
| CB2 | Greenwich Village, SoHo, NoHo | `cbmanhattan` | `cbmanhattan.cityofnewyork.us` Tribe HTML | ✅ |
| CB3 | East Village, Lower East Side, Chinatown | `nyc-gov-cb3` | nyc.gov h3/p calendar | ✅ |
| CB4 | Chelsea, Hell's Kitchen | `cbmanhattan` | `cbmanhattan.cityofnewyork.us` Tribe HTML | ✅ |
| CB5 | Midtown | `cb5-rest` | `cb5.org` Tribe REST | ✅ 50 events |
| CB6 | Murray Hill, Gramercy, Stuyvesant Town | `cbsix` | `cbsix.org` HTML | ✅ |
| CB7 | Upper West Side, Lincoln Square | `mcb7-bundle` | `mcb7.org` Vite/React JS bundle | ✅ 36 events |
| CB8 | Upper East Side, Roosevelt Island | `cb8m-rest` | `cb8m.com` Tribe REST | ✅ 67 events |
| CB9 | Morningside Heights, Hamilton Heights | `cb9m-gcal` | Google Calendar + pattern fallback | 🔶 GCal often empty |
| CB10 | Central Harlem | `cbmanhattan` | `cbmanhattan.cityofnewyork.us` Tribe HTML | ✅ |
| **CB11** | **East Harlem** | `cb11m` | **Airtable embed — auth blocked** | **⚠️ pattern only** |
| CB12 | Washington Heights, Inwood | `cbmanhattan` | `cbmanhattan.cityofnewyork.us` Tribe HTML | ✅ |

---

### Brooklyn (14 live, 2 partial, 2 pattern)

| Board | Neighborhoods | Type | Source | Status |
|---|---|---|---|---|
| CB1 | Greenpoint, Williamsburg | `brooklyn-cb1-pdf` | Annual press-release PDF | ✅ full board dates 2026–27 |
| CB2 | Downtown, Brooklyn Heights, DUMBO, Fort Greene | `cbbrooklyn` | `cbbrooklyn.cityofnewyork.us` Tribe HTML | ✅ |
| CB3 | Bedford-Stuyvesant | `cb3brooklyn-gcal` | GCal `bk03@cb.nyc.gov` | 🔶 ~2 events; pattern fills rest |
| CB4 | Bushwick | `brooklyn-cb4-js` | Custom JS `calEvents` array | ✅ 6+ meetings/month |
| CB5 | East New York, Cypress Hills | `brooklyn-cb5-generated` | Hardcoded from meetings page schedule | ✅ 9 committees, accurate |
| CB6 | Park Slope, Carroll Gardens, Red Hook, Gowanus | `cb6brooklyn-api` | `brooklyncb6.cityofnewyork.us` Tribe REST | ✅ 21 meetings |
| CB7 | Sunset Park, Windsor Terrace | `cbbrooklyn` | `cbbrooklyn.cityofnewyork.us/cb7` Tribe HTML | 🔶 1 event now; grows as posted |
| CB8 | Crown Heights, Prospect Heights | `cb8brooklyn-gcal` | GCal `u0jm9q72uejq6doel8n061pngs@group.calendar.google.com` | 🔶 board posts sporadically |
| CB9 | Crown Heights, Prospect Lefferts Gardens | `brooklyn-cb9-csv` | CSV `/assets/brooklyncb9/data/calendar.csv` | ✅ 13 meetings |
| CB10 | Bay Ridge, Dyker Heights, Fort Hamilton | `cbbrooklyn` | `cbbrooklyn.cityofnewyork.us` Tribe HTML | ✅ |
| CB11 | Bensonhurst, Bath Beach, Gravesend | `cb11brooklyn` | `brooklyncb11.org` WordPress posts | ✅ |
| **CB12** | **Borough Park, Kensington** | `nyc-gov` | **nyc.gov page empty** | **⚠️ pattern only** |
| **CB13** | **Coney Island, Brighton Beach, Gravesend** | `nyc-gov` | **nyc.gov 404** | **⚠️ pattern only** |
| CB14 | Flatbush, Midwood | `cb14brooklyn` | `cb14brooklyn.com` WordPress | ✅ |
| CB15 | Sheepshead Bay, Manhattan Beach, Gerritsen Beach | `nyc-gov` | nyc.gov static HTML dates | 🔶 1 future date; pattern fills rest |
| CB16 | Brownsville, Ocean Hill | `nyc-gov` | nyc.gov table scraper | ✅ |
| CB17 | East Flatbush | `cbbrooklyn` | `cbbrooklyn.cityofnewyork.us` Tribe HTML | ✅ |
| CB18 | Canarsie, Mill Basin, Flatlands, Marine Park | `brooklyn-cb18-js` | Custom JS `calEvents` `/assets/brooklyncb18/js/calendar-events.js` | ✅ picks up as posted |

---

### Queens (10 live, 2 partial, 2 pattern)

| Board | Neighborhoods | Type | Source | Status |
|---|---|---|---|---|
| CB1 | Astoria, Long Island City | `nyc-gov-queens` | nyc.gov h3/p calendar | ✅ 9 committee meetings |
| CB2 | Woodside, Sunnyside, Long Island City | `queens-cb2-gcal` | 14 committee Google Calendars | ✅ 10 events |
| CB3 | Jackson Heights, East Elmhurst | `queenscb3` | `queenscb3.cityofnewyork.us` Tribe REST | ✅ 3 meetings/month |
| CB4 | Corona, Elmhurst | `queens-cb4-csv` | CSV `/assets/queenscb4/data/queenscb4-calendar.csv` | 🔶 through May 2026; updates monthly |
| CB5 | Ridgewood, Glendale, Maspeth, Middle Village | `queens-cb5-js` | Custom JS `calEvents` `/assets/queenscb5/js/calendar_events.js` | ✅ 10 meetings |
| CB6 | Forest Hills, Rego Park | `queens-cb6-gcal` | GCal `queenscb6secretary@gmail.com` | ✅ 7 meetings |
| CB7 | Flushing, Whitestone, College Point | `queens-cb7-static` | nyc.gov static meetings page | 🔶 1 date only; pattern fills rest |
| CB8 | Fresh Meadows, Briarwood, Jamaica Hills | `queens-cb8-pdf` | Annual schedule memo PDF | ✅ full board dates |
| **CB9** | **Richmond Hill, Woodhaven, Ozone Park** | `nyc-gov-queens` | **nyc.gov empty page** | **⚠️ pattern only** |
| **CB10** | **Howard Beach, Ozone Park, South Ozone Park** | `nyc-gov-queens` | **nyc.gov empty page** | **⚠️ pattern only** |
| CB11 | Bayside, Douglaston, Little Neck | `nyc-gov-queens` | nyc.gov `<li>` date list | ✅ full board dates |
| **CB12** | **Jamaica, Hollis, St. Albans** | `nyc-gov-queens` | **PDF-only archive** | **⚠️ pattern only** |
| CB13 | Queens Village, Cambria Heights, Laurelton, Rosedale | `queens-cb13-gcal` | GCal `seeqcb13@gmail.com` | ✅ 9 committee meetings |
| CB14 | Far Rockaway, Rockaway, Arverne | `nyc-gov-queens` | nyc.gov calendar page | ✅ |

---

### Bronx (7 live, 2 hardcoded-accurate, 3 pattern)

| Board | Neighborhoods | Type | Source | Status |
|---|---|---|---|---|
| **CB1** | **Mott Haven, Port Morris, Melrose** | `nyc-gov-bronx` | **nyc.gov PDF-only** | **⚠️ pattern only** |
| **CB2** | **Hunts Point, Longwood** | `nyc-gov-bronx` | **JS stale since Apr 2026** | **⚠️ pattern only** |
| **CB3** | **Crotona Park, Claremont, Morrisania** | `nyc-gov-bronx` | **nyc.gov PDF archive** | **⚠️ pattern only** |
| CB4 | Highbridge, Concourse, Mount Eden | `bronx-cb4-calendar` | nyc.gov `<li>` list, no year | ✅ 7 meetings |
| **CB5** | **Fordham, University Heights, Morris Heights** | `nyc-gov-bronx` | **Image-based PDFs** | **⚠️ pattern only** |
| CB6 | Belmont, West Farms, East Tremont | `cbbronx` | `cbbronx.cityofnewyork.us` Tribe HTML | ✅ |
| **CB7** | **Kingsbridge, Bedford Park, Norwood** | `nyc-gov-bronx` | **PDF archive only** | **⚠️ pattern only** |
| CB8 | Riverdale, Fieldston, Kingsbridge | `cbbronx` | `cbbronx.cityofnewyork.us` Tribe HTML | ✅ |
| CB9 | Soundview, Parkchester, Castle Hill | `bronx-cb9-calendar` | nyc.gov `<p>/<br>` structure, no year | ✅ 7 meetings |
| CB10 | Throgs Neck, Co-op City, City Island | `bronx-cb10-pdf` | Monthly agenda PDF `agenda_month_year.pdf` | ✅ 6 meetings/month |
| CB11 | Pelham Parkway, Morris Park, Allerton | `bronx-cb11-generated` | Hardcoded from published preferences doc | ✅ 9 committees |
| CB12 | Williamsbridge, Wakefield, Woodlawn | `bronx-cb12-generated` | Hardcoded from calendar page committee table | ✅ 3 committees + full board |

---

### Staten Island (0 live — all pattern)

| Board | Neighborhoods | Type | Source | Status |
|---|---|---|---|---|
| **CB1** | **St. George, Port Richmond, Stapleton** | `nyc-gov-si` | **Grid PDF calendar** | **⚠️ pattern only** |
| **CB2** | **New Dorp, Midland Beach, Dongan Hills** | `nyc-gov-si` | **No data found** | **⚠️ pattern only** |
| **CB3** | **Tottenville, Great Kills, Eltingville** | `nyc-gov-si` | **Grid PDF calendar** | **⚠️ pattern only** |

---

## Summary

| Category | Count | Notes |
|---|---|---|
| ✅ Live scrapers | 35 | Real meeting data from APIs, HTML, PDFs, JS/CSV files, GCal |
| 🔶 Partial (live + fallback) | 7 | Scraper runs first; falls to pattern when < 2 events found |
| ✅ Hardcoded-accurate | 3 | Derived from official published schedule documents |
| ⚠️ Pattern-only | 14 | Generic nth-weekday fallback; marked with `*` in the UI |

**Total: 59 boards across 5 boroughs**

---

## Maintenance Notes

- **Bronx CB2**: Has a JS `calEvents` file at `/assets/bronxcb2/js/calendar-events.js` that was last updated April 2026. When they update it, switching from `nyc-gov-bronx` to a `bronx-cb2-js` type (same pattern as BK CB4/18) would unlock the data.
- **Queens CB4 CSV**: Updated monthly by the board; check `/assets/queenscb4/data/queenscb4-calendar.csv` each month.
- **Brooklyn CB8 GCal**: The board posts meetings on a rolling basis (not far in advance). Calendar should be checked; if consistently empty, fallback is the 2nd Thursday schedule.
- **Staten Island**: All three boards publish grid-format PDF calendars that are not text-extractable. PDF parsing is not feasible; manual schedule entry would be needed.
- **pdf-parse v2 API**: Uses `new PDFParse({ url })` — takes a URL directly, no buffer fetch needed. Dependency: `npm install pdf-parse`.
- **GCal holiday filtering**: Use `HOLIDAY_RE` as `titleExclude` in `scrapeGCalICS()` for GCals that mix board meetings with US holidays (e.g., CB9 Manhattan).

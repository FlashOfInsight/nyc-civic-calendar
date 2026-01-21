// Community Boards Scraper
// Scrapes meeting data from Manhattan and Brooklyn Community Boards

const https = require("https");
const http = require("http");
const cheerio = require("cheerio");

// Manhattan Community Board configurations
const MANHATTAN_BOARDS = [
  { id: 1, name: "CB1 Manhattan", neighborhoods: "Financial District, Battery Park City, Tribeca", type: "nyc-gov-cb1" },
  { id: 2, name: "CB2 Manhattan", neighborhoods: "Greenwich Village, SoHo, NoHo", type: "cbmanhattan", url: "https://cbmanhattan.cityofnewyork.us/cb2/calendar/" },
  { id: 3, name: "CB3 Manhattan", neighborhoods: "East Village, Lower East Side, Chinatown", type: "nyc-gov-cb3" },
  { id: 4, name: "CB4 Manhattan", neighborhoods: "Chelsea, Hell's Kitchen", type: "cbmanhattan", url: "https://cbmanhattan.cityofnewyork.us/cb4/calendar/" },
  { id: 5, name: "CB5 Manhattan", neighborhoods: "Midtown", type: "cb5" },
  { id: 6, name: "CB6 Manhattan", neighborhoods: "Murray Hill, Gramercy Park, Stuyvesant Town", type: "cbsix" },
  { id: 7, name: "CB7 Manhattan", neighborhoods: "Upper West Side, Lincoln Square", type: "mcb7" },
  { id: 8, name: "CB8 Manhattan", neighborhoods: "Upper East Side, Roosevelt Island", type: "cb8m" },
  { id: 9, name: "CB9 Manhattan", neighborhoods: "Morningside Heights, Hamilton Heights", type: "cb9m" },
  { id: 10, name: "CB10 Manhattan", neighborhoods: "Central Harlem", type: "cbmanhattan", url: "https://cbmanhattan.cityofnewyork.us/cb10/events/" },
  { id: 11, name: "CB11 Manhattan", neighborhoods: "East Harlem", type: "cb11m" },
  { id: 12, name: "CB12 Manhattan", neighborhoods: "Washington Heights, Inwood", type: "cbmanhattan", url: "https://cbmanhattan.cityofnewyork.us/cb12/calendar/" }
];

// Queens Community Board configurations
const QUEENS_BOARDS = [
  { id: 1, name: "CB1 Queens", neighborhoods: "Astoria, Long Island City", type: "nyc-gov-queens", url: "https://www.nyc.gov/site/queenscb1/meetings/meetings.page" },
  { id: 2, name: "CB2 Queens", neighborhoods: "Woodside, Sunnyside, Long Island City", type: "nyc-gov-queens", url: "https://www.nyc.gov/site/queenscb2/meetings/meetings.page" },
  { id: 3, name: "CB3 Queens", neighborhoods: "Jackson Heights, East Elmhurst", type: "queenscb3", url: "https://queenscb3.cityofnewyork.us/calendar/" },
  { id: 4, name: "CB4 Queens", neighborhoods: "Corona, Elmhurst", type: "nyc-gov-queens", url: "https://www.nyc.gov/site/queenscb4/meetings/meetings.page" },
  { id: 5, name: "CB5 Queens", neighborhoods: "Ridgewood, Glendale, Maspeth, Middle Village", type: "nyc-gov-queens", url: "https://www.nyc.gov/site/queenscb5/meetings/meetings.page" },
  { id: 6, name: "CB6 Queens", neighborhoods: "Forest Hills, Rego Park", type: "nyc-gov-queens", url: "https://www.nyc.gov/site/queenscb6/meetings/meetings.page" },
  { id: 7, name: "CB7 Queens", neighborhoods: "Flushing, Whitestone, College Point", type: "nyc-gov-queens", url: "https://www.nyc.gov/site/queenscb7/meetings/meetings.page" },
  { id: 8, name: "CB8 Queens", neighborhoods: "Fresh Meadows, Briarwood, Jamaica Hills", type: "nyc-gov-queens", url: "https://www.nyc.gov/site/queenscb8/meetings/meetings.page" },
  { id: 9, name: "CB9 Queens", neighborhoods: "Richmond Hill, Woodhaven, Ozone Park, Kew Gardens", type: "nyc-gov-queens", url: "https://www.nyc.gov/site/queenscb9/calendar/calendar.page" },
  { id: 10, name: "CB10 Queens", neighborhoods: "Howard Beach, Ozone Park, South Ozone Park", type: "nyc-gov-queens", url: "https://www.nyc.gov/site/queenscb10/calendar/calendar.page" },
  { id: 11, name: "CB11 Queens", neighborhoods: "Bayside, Douglaston, Little Neck", type: "nyc-gov-queens", url: "https://www.nyc.gov/site/queenscb11/meetings/meetings.page" },
  { id: 12, name: "CB12 Queens", neighborhoods: "Jamaica, Hollis, St. Albans", type: "nyc-gov-queens", url: "https://www.nyc.gov/site/queenscb12/meetings/meetings.page" },
  { id: 13, name: "CB13 Queens", neighborhoods: "Queens Village, Cambria Heights, Laurelton, Rosedale", type: "nyc-gov-queens", url: "https://www.nyc.gov/site/queenscb13/meetings/meetings.page" },
  { id: 14, name: "CB14 Queens", neighborhoods: "Far Rockaway, Rockaway, Arverne", type: "nyc-gov-queens", url: "https://www.nyc.gov/site/queenscb14/calendar/calendar.page" }
];

// Bronx Community Board configurations
const BRONX_BOARDS = [
  { id: 1, name: "CB1 Bronx", neighborhoods: "Mott Haven, Port Morris, Melrose", type: "nyc-gov-bronx", url: "https://www.nyc.gov/site/bronxcb1/meetings/meetings.page" },
  { id: 2, name: "CB2 Bronx", neighborhoods: "Hunts Point, Longwood", type: "nyc-gov-bronx", url: "https://www.nyc.gov/site/bronxcb2/meetings/meetings.page" },
  { id: 3, name: "CB3 Bronx", neighborhoods: "Crotona Park, Claremont, Morrisania", type: "nyc-gov-bronx", url: "https://www.nyc.gov/site/bronxcb3/meetings/meetings.page" },
  { id: 4, name: "CB4 Bronx", neighborhoods: "Highbridge, Concourse, Mount Eden", type: "nyc-gov-bronx", url: "https://www.nyc.gov/site/bronxcb4/meetings/meetings.page" },
  { id: 5, name: "CB5 Bronx", neighborhoods: "Fordham, University Heights, Morris Heights", type: "nyc-gov-bronx", url: "https://www.nyc.gov/site/bronxcb5/meetings/meetings.page" },
  { id: 6, name: "CB6 Bronx", neighborhoods: "Belmont, West Farms, East Tremont", type: "cbbronx", url: "https://cbbronx.cityofnewyork.us/cb6/calendar/" },
  { id: 7, name: "CB7 Bronx", neighborhoods: "Kingsbridge, Bedford Park, Norwood", type: "nyc-gov-bronx", url: "https://www.nyc.gov/site/bronxcb7/meetings/meetings.page" },
  { id: 8, name: "CB8 Bronx", neighborhoods: "Riverdale, Fieldston, Kingsbridge", type: "cbbronx", url: "https://cbbronx.cityofnewyork.us/cb8/calendar/" },
  { id: 9, name: "CB9 Bronx", neighborhoods: "Soundview, Parkchester, Castle Hill", type: "nyc-gov-bronx", url: "https://www.nyc.gov/site/bronxcb9/meetings/meetings.page" },
  { id: 10, name: "CB10 Bronx", neighborhoods: "Throgs Neck, Co-op City, City Island", type: "nyc-gov-bronx", url: "https://www.nyc.gov/site/bronxcb10/meetings/meetings.page" },
  { id: 11, name: "CB11 Bronx", neighborhoods: "Pelham Parkway, Morris Park, Allerton", type: "nyc-gov-bronx", url: "https://www.nyc.gov/site/bronxcb11/meetings/meetings.page" },
  { id: 12, name: "CB12 Bronx", neighborhoods: "Williamsbridge, Wakefield, Woodlawn", type: "nyc-gov-bronx", url: "https://www.nyc.gov/site/bronxcb12/meetings/meetings.page" }
];

// Staten Island Community Board configurations
const STATEN_ISLAND_BOARDS = [
  { id: 1, name: "CB1 Staten Island", neighborhoods: "St. George, Port Richmond, Stapleton", type: "nyc-gov-si", url: "https://www.nyc.gov/site/statenislandcb1/meetings/meetings.page" },
  { id: 2, name: "CB2 Staten Island", neighborhoods: "New Dorp, Midland Beach, Dongan Hills", type: "nyc-gov-si", url: "https://www.nyc.gov/site/statenislandcb2/meetings/meetings.page" },
  { id: 3, name: "CB3 Staten Island", neighborhoods: "Tottenville, Great Kills, Eltingville", type: "nyc-gov-si", url: "https://www.nyc.gov/site/statenislandcb3/meetings/meetings.page" }
];

// Brooklyn Community Board configurations
const BROOKLYN_BOARDS = [
  { id: 1, name: "CB1 Brooklyn", neighborhoods: "Greenpoint, Williamsburg", type: "nyc-gov", url: "https://www.nyc.gov/site/brooklyncb1/calendar/calendar.page" },
  { id: 2, name: "CB2 Brooklyn", neighborhoods: "Downtown Brooklyn, Brooklyn Heights, DUMBO, Fort Greene", type: "cbbrooklyn", url: "https://cbbrooklyn.cityofnewyork.us/cb2/calendar/" },
  { id: 3, name: "CB3 Brooklyn", neighborhoods: "Bedford-Stuyvesant", type: "nyc-gov", url: "https://www.nyc.gov/site/brooklyncb3/calendar/calendar.page" },
  { id: 4, name: "CB4 Brooklyn", neighborhoods: "Bushwick", type: "nyc-gov", url: "https://www.nyc.gov/site/brooklyncb4/calendar/calendar.page" },
  { id: 5, name: "CB5 Brooklyn", neighborhoods: "East New York, Cypress Hills", type: "nyc-gov", url: "https://www.nyc.gov/site/brooklyncb5/calendar/calendar.page" },
  { id: 6, name: "CB6 Brooklyn", neighborhoods: "Park Slope, Carroll Gardens, Red Hook, Gowanus", type: "cb6brooklyn", url: "https://brooklyncb6.cityofnewyork.us/calendar/" },
  { id: 7, name: "CB7 Brooklyn", neighborhoods: "Sunset Park, Windsor Terrace", type: "nyc-gov", url: "https://www.nyc.gov/site/brooklyncb7/calendar/calendar.page" },
  { id: 8, name: "CB8 Brooklyn", neighborhoods: "Crown Heights, Prospect Heights", type: "cb8brooklyn", url: "https://www.brooklyncb8.org/events/" },
  { id: 9, name: "CB9 Brooklyn", neighborhoods: "Crown Heights, Prospect Lefferts Gardens", type: "nyc-gov", url: "https://www.nyc.gov/site/brooklyncb9/calendar/calendar.page" },
  { id: 10, name: "CB10 Brooklyn", neighborhoods: "Bay Ridge, Dyker Heights, Fort Hamilton", type: "cbbrooklyn", url: "https://cbbrooklyn.cityofnewyork.us/cb10/calendar/" },
  { id: 11, name: "CB11 Brooklyn", neighborhoods: "Bensonhurst, Bath Beach, Gravesend", type: "cb11brooklyn", url: "https://www.brooklyncb11.org/category/meeting-notice/" },
  { id: 12, name: "CB12 Brooklyn", neighborhoods: "Borough Park, Kensington", type: "nyc-gov", url: "https://www.nyc.gov/site/brooklyncb12/calendar/calendar.page" },
  { id: 13, name: "CB13 Brooklyn", neighborhoods: "Coney Island, Brighton Beach, Gravesend", type: "nyc-gov", url: "https://www.nyc.gov/site/brooklyncb13/calendar/calendar.page" },
  { id: 14, name: "CB14 Brooklyn", neighborhoods: "Flatbush, Midwood", type: "cb14brooklyn", url: "https://cb14brooklyn.com/meetings/" },
  { id: 15, name: "CB15 Brooklyn", neighborhoods: "Sheepshead Bay, Manhattan Beach, Gerritsen Beach", type: "nyc-gov", url: "https://www.nyc.gov/site/brooklyncb15/calendar/calendar.page" },
  { id: 16, name: "CB16 Brooklyn", neighborhoods: "Brownsville, Ocean Hill", type: "nyc-gov", url: "https://www.nyc.gov/site/brooklyncb16/about/calendar.page" },
  { id: 17, name: "CB17 Brooklyn", neighborhoods: "East Flatbush", type: "cbbrooklyn", url: "https://cbbrooklyn.cityofnewyork.us/cb17/events/" },
  { id: 18, name: "CB18 Brooklyn", neighborhoods: "Canarsie, Mill Basin, Flatlands, Marine Park", type: "nyc-gov", url: "https://www.nyc.gov/site/brooklyncb18/calendar/calendar.page" }
];

/**
 * Fetch HTML from URL with redirect handling
 */
function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
      }
    };

    protocol.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith("/")) {
          const urlObj = new URL(url);
          redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
        }
        fetchHTML(redirectUrl).then(resolve).catch(reject);
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

/**
 * Parse month name to number (0-indexed)
 */
function parseMonth(monthName) {
  const months = {
    "january": 0, "jan": 0, "february": 1, "feb": 1, "march": 2, "mar": 2,
    "april": 3, "apr": 3, "may": 4, "june": 5, "jun": 5, "july": 6, "jul": 6,
    "august": 7, "aug": 7, "september": 8, "sep": 8, "sept": 8,
    "october": 9, "oct": 9, "november": 10, "nov": 10, "december": 11, "dec": 11
  };
  return months[monthName.toLowerCase()] ?? -1;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Parse time string to HH:MM format
 */
function parseTime(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)?/i);
  if (!match) return null;
  let hours = parseInt(match[1]);
  const minutes = match[2] || "00";
  const ampm = (match[3] || "").toUpperCase();
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

/**
 * Categorize meeting title into committee key
 */
function categorizeCommittee(title) {
  const lower = title.toLowerCase();

  // Full Board / General Board
  if (lower.includes("full board") || lower.includes("general board") || lower.includes("monthly meeting") || lower.includes("board meeting")) {
    return "full-board";
  }
  // Executive
  if (lower.includes("executive")) {
    return "executive";
  }
  // Land Use / Zoning / Housing
  if (lower.includes("land use") || lower.includes("zoning")) {
    return "land-use";
  }
  // Landmarks / Preservation / Historic
  if (lower.includes("landmark") || lower.includes("preservation") || lower.includes("historic")) {
    return "landmarks";
  }
  // Transportation / Traffic
  if (lower.includes("transport") || lower.includes("traffic")) {
    return "transportation";
  }
  // Parks / Recreation / Waterfront / Environment
  if (lower.includes("park") || lower.includes("waterfront") || lower.includes("recreation") || lower.includes("environment")) {
    return "parks";
  }
  // SLA / Licensing / Permits / Business
  if (lower.includes("sla") || lower.includes("licens") || lower.includes("permit") || lower.includes("business") || lower.includes("outdoor dining")) {
    return "licensing";
  }
  // Health / Seniors / Human Services / Social Services
  if (lower.includes("health") || lower.includes("senior") || lower.includes("human service") || lower.includes("social service")) {
    return "health";
  }
  // Education / Youth / Schools
  if (lower.includes("education") || lower.includes("youth") || lower.includes("school") || lower.includes("librar")) {
    return "education";
  }
  // Housing / Homelessness
  if (lower.includes("housing") || lower.includes("homeless")) {
    return "housing";
  }
  // Public Safety / Sanitation
  if (lower.includes("safety") || lower.includes("sanitation") || lower.includes("police")) {
    return "public-safety";
  }
  // Arts / Culture
  if (lower.includes("art") || lower.includes("culture") || lower.includes("cultural")) {
    return "arts";
  }
  // Economic Development
  if (lower.includes("economic") || lower.includes("development") || lower.includes("technolog")) {
    return "economic";
  }
  // Quality of Life
  if (lower.includes("quality of life")) {
    return "quality-of-life";
  }
  // Default to full-board for unrecognized
  return "full-board";
}

// Bad titles to filter out (navigation elements, generic text)
const BAD_TITLES = [
  "next",
  "previous",
  "event views navigation",
  "list",
  "month",
  "day",
  "today",
  "subscribe",
  "export",
  "print",
  "calendar",
  "events",
  "upcoming events",
  "past events",
  "view all",
  "load more",
  "show more",
  "read more"
];

/**
 * Create a meeting object
 */
function createMeeting(boardId, title, dateStr, time, location, url, borough = "manhattan") {
  const cleanTitle = title.replace(/\s+/g, " ").trim();

  // Skip bad titles (navigation elements, generic text)
  const lowerTitle = cleanTitle.toLowerCase();
  if (BAD_TITLES.includes(lowerTitle) || lowerTitle.length < 3) {
    return null;
  }

  const committeeKey = categorizeCommittee(cleanTitle);
  const boroughCodes = { "brooklyn": "bk", "manhattan": "mn", "queens": "qn", "bronx": "bx", "staten-island": "si" };
  const boroughCode = boroughCodes[borough] || "mn";
  const boroughName = borough.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  // Enhance generic titles with board context
  let displayTitle = cleanTitle;
  if (lowerTitle === "committee meeting" || lowerTitle === "meeting") {
    displayTitle = `${boroughName} CB${boardId} Committee Meeting`;
  } else if (lowerTitle === "full board meeting" || lowerTitle === "full board") {
    displayTitle = `${boroughName} CB${boardId} Full Board Meeting`;
  } else if (lowerTitle === "executive committee" || lowerTitle === "executive") {
    displayTitle = `${boroughName} CB${boardId} Executive Committee`;
  }

  const id = `cb-${boroughCode}${boardId}-${committeeKey}-${dateStr}-${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 30)}`;
  return {
    id,
    org: `community-boards.${borough}.${boardId}.${committeeKey}`,
    title: displayTitle,
    date: dateStr,
    time: time || "18:30",
    location: location || `Community Board ${boardId} Office`,
    description: `${boroughName} Community Board ${boardId}`,
    url
  };
}

/**
 * Get Nth weekday of a month
 */
function getNthWeekday(year, month, weekday, n) {
  const firstDay = new Date(year, month, 1);
  let dayOfWeek = firstDay.getDay();
  let diff = weekday - dayOfWeek;
  if (diff < 0) diff += 7;
  const nthDay = 1 + diff + (n - 1) * 7;
  return new Date(year, month, nthDay);
}

/**
 * Scrape cbmanhattan.cityofnewyork.us boards (CB2, CB4, CB10, CB12)
 */
async function scrapeCBManhattan(board) {
  const meetings = [];
  const now = new Date();

  try {
    for (let monthOffset = 0; monthOffset <= 2; monthOffset++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;

      const calendarUrl = board.url.includes("/events/")
        ? `${board.url}${year}-${String(month).padStart(2, "0")}/`
        : board.url;

      try {
        const html = await fetchHTML(calendarUrl);
        const $ = cheerio.load(html);

        // Parse tribe events calendar
        $(".tribe-events-calendar-list__event-row, .tribe-common-g-row, .type-tribe_events, article").each((_, elem) => {
          const $elem = $(elem);
          const title = $elem.find("h3, .tribe-events-calendar-list__event-title a, .tribe-event-url").first().text().trim();
          if (!title || title.length < 3) return;

          const dateText = $elem.find("time, .tribe-events-calendar-list__event-datetime, .tribe-event-date-start").first().text().trim();
          const dateMatch = dateText.match(/(\w+)\s+(\d{1,2})(?:,?\s+(\d{4}))?/);
          if (!dateMatch) return;

          const monthNum = parseMonth(dateMatch[1]);
          if (monthNum === -1) return;

          const day = parseInt(dateMatch[2]);
          const eventYear = dateMatch[3] ? parseInt(dateMatch[3]) : year;
          const dateStr = formatDate(eventYear, monthNum, day);

          const timeMatch = dateText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
          const time = timeMatch ? parseTime(timeMatch[1]) : "18:30";

          const location = $elem.find(".tribe-events-calendar-list__event-venue, .tribe-venue").first().text().trim();

          meetings.push(createMeeting(board.id, title, dateStr, time, location, board.url));
        });
      } catch (err) {
        console.error(`  Error fetching ${calendarUrl}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`Error scraping ${board.name}:`, err.message);
  }

  return meetings.filter(Boolean);
}

/**
 * Scrape CB1 from nyc.gov
 */
async function scrapeCB1() {
  const meetings = [];
  const now = new Date();
  const url = "https://www.nyc.gov/site/manhattancb1/meetings/committee-agendas.page";

  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    // CB1 uses a specific format with dates like "1/7"
    $("a, p, li, td").each((_, elem) => {
      const text = $(elem).text().trim();

      // Match patterns like "1/7 - Transportation" or "January 7"
      const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})(?:\s*[-–]\s*(.+))?/) ||
                       text.match(/(\w+)\s+(\d{1,2})(?:\s*[-–]\s*(.+))?/);

      if (dateMatch) {
        let month, day, meetingName;

        if (dateMatch[1].match(/^\d+$/)) {
          month = parseInt(dateMatch[1]) - 1;
          day = parseInt(dateMatch[2]);
          meetingName = dateMatch[3] || "";
        } else {
          month = parseMonth(dateMatch[1]);
          if (month === -1) return;
          day = parseInt(dateMatch[2]);
          meetingName = dateMatch[3] || "";
        }

        let year = now.getFullYear();
        const testDate = new Date(year, month, day);
        if (testDate < new Date(now.getFullYear(), now.getMonth() - 1, 1)) {
          year++;
        }

        const meetingDate = new Date(year, month, day);
        const sixMonthsLater = new Date();
        sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

        if (meetingDate >= now && meetingDate <= sixMonthsLater) {
          if (!meetingName) {
            // Try to find committee name nearby
            const nameMatch = text.match(/(Transportation|Land Use|Landmarks|Finance|Parks|Housing|Health|Education|Executive|Full Board|Committee)/i);
            meetingName = nameMatch ? nameMatch[1] + " Committee" : "Committee Meeting";
          }

          const dateStr = formatDate(year, month, day);
          const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
          const time = timeMatch ? parseTime(timeMatch[1]) : "18:00";

          meetings.push(createMeeting(1, meetingName, dateStr, time, "1 Centre Street, New York, NY", url));
        }
      }
    });
  } catch (err) {
    console.error("Error scraping CB1:", err.message);
  }

  return meetings.filter(Boolean);
}

/**
 * Scrape CB3 from nyc.gov
 */
async function scrapeCB3() {
  const meetings = [];
  const now = new Date();
  const url = "https://www.nyc.gov/site/manhattancb3/calendar/calendar.page";

  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    // Look for calendar entries
    $("tr, li, p, div").each((_, elem) => {
      const text = $(elem).text().trim();

      // Match "January 8" or "Thursday, January 8"
      const dateMatch = text.match(/(?:\w+day,?\s+)?(\w+)\s+(\d{1,2})(?:\s+at\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?))?/i);
      if (!dateMatch) return;

      const month = parseMonth(dateMatch[1]);
      if (month === -1) return;

      const day = parseInt(dateMatch[2]);
      let year = now.getFullYear();
      const testDate = new Date(year, month, day);
      if (testDate < new Date(now.getFullYear(), now.getMonth() - 1, 1)) {
        year++;
      }

      const meetingDate = new Date(year, month, day);
      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

      if (meetingDate < now || meetingDate > sixMonthsLater) return;

      // Extract committee name - look for patterns
      const nameMatch = text.match(/^([A-Z][A-Za-z,\s&]+(?:Committee|Board|Meeting))/);
      if (!nameMatch) return;

      const meetingName = nameMatch[1].trim();
      const dateStr = formatDate(year, month, day);
      const time = dateMatch[3] ? parseTime(dateMatch[3]) : "18:30";

      // Avoid duplicates
      if (meetings.find(m => m.date === dateStr && m.title === meetingName)) return;

      meetings.push(createMeeting(3, meetingName, dateStr, time, "59 East 4th Street, New York, NY", url));
    });
  } catch (err) {
    console.error("Error scraping CB3:", err.message);
  }

  return meetings.filter(Boolean);
}

/**
 * Scrape CB6 from cbsix.org
 */
async function scrapeCB6() {
  const meetings = [];
  const now = new Date();
  const url = "https://cbsix.org/meetings-calendar/";

  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    // CB6 lists meetings in a specific format
    $("h3, h4, p, li, div").each((_, elem) => {
      const text = $(elem).text().trim();

      // Match "Wednesday, January 14, 2026 at 7:00 PM"
      const dateMatch = text.match(/(\w+day),?\s+(\w+)\s+(\d{1,2}),?\s+(\d{4})(?:\s+at\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?))?/i);
      if (!dateMatch) return;

      const month = parseMonth(dateMatch[2]);
      if (month === -1) return;

      const day = parseInt(dateMatch[3]);
      const year = parseInt(dateMatch[4]);
      const meetingDate = new Date(year, month, day);

      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
      if (meetingDate < now || meetingDate > sixMonthsLater) return;

      // Find the committee name (usually in a heading before or the line itself)
      let meetingName = "";
      const $parent = $(elem).parent();
      const $prev = $(elem).prev("h3, h4, strong");
      if ($prev.length) {
        meetingName = $prev.text().trim();
      }
      if (!meetingName) {
        const nameMatch = text.match(/^([A-Z][A-Za-z\s&]+?)(?:\s+[-–]|\s+\w+day)/);
        if (nameMatch) meetingName = nameMatch[1].trim();
      }
      if (!meetingName) meetingName = "Committee Meeting";

      const dateStr = formatDate(year, month, day);
      const time = dateMatch[5] ? parseTime(dateMatch[5]) : "18:30";

      if (meetings.find(m => m.date === dateStr && m.title === meetingName)) return;

      meetings.push(createMeeting(6, meetingName, dateStr, time, "211 East 43rd Street, Suite 1404, New York, NY", url));
    });
  } catch (err) {
    console.error("Error scraping CB6:", err.message);
  }

  return meetings.filter(Boolean);
}

/**
 * Scrape CB8 from cb8m.com
 */
async function scrapeCB8() {
  const meetings = [];
  const now = new Date();
  const url = "https://www.cb8m.com/";

  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    // CB8 has a well-structured calendar
    $(".event, article, .tribe-events-calendar-list__event, li, tr").each((_, elem) => {
      const text = $(elem).text().trim();

      // Match dates like "Tuesday, January 6, 2026"
      const dateMatch = text.match(/(\w+day),?\s+(\w+)\s+(\d{1,2}),?\s+(\d{4})/i);
      if (!dateMatch) return;

      const month = parseMonth(dateMatch[2]);
      if (month === -1) return;

      const day = parseInt(dateMatch[3]);
      const year = parseInt(dateMatch[4]);
      const meetingDate = new Date(year, month, day);

      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
      if (meetingDate < now || meetingDate > sixMonthsLater) return;

      // Find committee name
      let meetingName = "";
      const nameMatch = text.match(/([A-Z][A-Za-z,\s&]+Committee)/);
      if (nameMatch) meetingName = nameMatch[1].trim();
      if (!meetingName) {
        const altMatch = text.match(/(Full Board|Executive|Transportation|Parks|Landmarks|Land Use|Housing|Health|Small Business|Street)/i);
        if (altMatch) meetingName = altMatch[1] + " Committee";
      }
      if (!meetingName) return;

      const dateStr = formatDate(year, month, day);
      const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
      const time = timeMatch ? parseTime(timeMatch[1]) : "18:30";

      if (meetings.find(m => m.date === dateStr && m.title === meetingName)) return;

      meetings.push(createMeeting(8, meetingName, dateStr, time, "505 Park Avenue, Suite 620, New York, NY", url));
    });
  } catch (err) {
    console.error("Error scraping CB8:", err.message);
  }

  return meetings.filter(Boolean);
}

/**
 * Generate recurring meetings for boards with fixed schedules
 * Used as fallback for boards that are hard to scrape
 */
function generateRecurringMeetings(boardId, committees, location, url) {
  const meetings = [];
  const now = new Date();
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  for (let monthOffset = 0; monthOffset <= 6; monthOffset++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    for (const committee of committees) {
      const meetingDate = getNthWeekday(year, month, committee.weekday, committee.nth);

      if (meetingDate >= now && meetingDate <= sixMonthsLater) {
        const dateStr = formatDate(year, month, meetingDate.getDate());
        meetings.push(createMeeting(boardId, committee.name, dateStr, committee.time, location, url));
      }
    }
  }

  return meetings.filter(Boolean);
}

/**
 * CB5 - Generate from known schedule (hard to scrape)
 */
function generateCB5Meetings() {
  const committees = [
    { name: "Full Board Meeting", weekday: 4, nth: 2, time: "18:30" }, // 2nd Thursday
    { name: "Transportation & Environment Committee", weekday: 2, nth: 1, time: "18:30" },
    { name: "Land Use, Housing & Zoning Committee", weekday: 3, nth: 1, time: "18:30" },
    { name: "Landmarks Committee", weekday: 4, nth: 1, time: "18:30" },
    { name: "Business Affairs Committee", weekday: 1, nth: 2, time: "18:30" },
    { name: "Parks & Public Spaces Committee", weekday: 2, nth: 2, time: "18:30" }
  ];
  return generateRecurringMeetings(5, committees, "450 7th Avenue, New York, NY", "https://www.cb5.org");
}

/**
 * CB7 - Generate from known schedule
 */
function generateCB7Meetings() {
  const committees = [
    { name: "Full Board Meeting", weekday: 2, nth: 1, time: "18:30" }, // 1st Tuesday
    { name: "Executive Committee", weekday: 3, nth: 4, time: "10:30" },
    { name: "Land Use Committee", weekday: 3, nth: 1, time: "18:30" },
    { name: "Transportation Committee", weekday: 1, nth: 2, time: "18:30" },
    { name: "Parks & Environment Committee", weekday: 4, nth: 1, time: "18:30" },
    { name: "Health & Human Services Committee", weekday: 1, nth: 3, time: "18:30" },
    { name: "Preservation Committee", weekday: 2, nth: 2, time: "18:30" },
    { name: "Business & Consumer Issues Committee", weekday: 3, nth: 2, time: "18:30" }
  ];
  return generateRecurringMeetings(7, committees, "250 W. 87th Street, New York, NY", "https://www.mcb7.org");
}

/**
 * CB9 - Generate from known schedule
 */
function generateCB9Meetings() {
  const committees = [
    { name: "Full Board Meeting", weekday: 4, nth: 3, time: "18:30" }, // 3rd Thursday
    { name: "Executive Committee", weekday: 4, nth: 2, time: "18:30" },
    { name: "Housing, Land Use & Zoning Committee", weekday: 1, nth: 1, time: "18:30" },
    { name: "Transportation Committee", weekday: 2, nth: 1, time: "18:30" },
    { name: "Parks & Environment Committee", weekday: 3, nth: 1, time: "18:30" },
    { name: "Health & Environment Committee", weekday: 1, nth: 2, time: "18:30" }
  ];
  return generateRecurringMeetings(9, committees, "423 W. 127th Street, New York, NY", "https://www.cb9m.org");
}

/**
 * CB11 - Generate from known schedule
 */
function generateCB11Meetings() {
  const committees = [
    { name: "Full Board Meeting", weekday: 2, nth: 3, time: "18:30" }, // 3rd Tuesday
    { name: "Executive Committee", weekday: 2, nth: 2, time: "18:30" },
    { name: "Land Use Committee", weekday: 3, nth: 1, time: "18:30" },
    { name: "Housing & Human Services Committee", weekday: 4, nth: 1, time: "18:30" },
    { name: "Parks & Recreation Committee", weekday: 1, nth: 2, time: "18:30" },
    { name: "Health & Environment Committee", weekday: 3, nth: 2, time: "18:30" }
  ];
  return generateRecurringMeetings(11, committees, "55 East 115th Street, New York, NY", "https://www.cb11m.org");
}

// ==================== BROOKLYN SCRAPERS ====================

/**
 * Scrape Brooklyn boards from nyc.gov sites
 */
async function scrapeBrooklynNYCGov(board) {
  const meetings = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Include today's meetings

  try {
    const html = await fetchHTML(board.url);
    const $ = cheerio.load(html);

    // NYC.gov calendars have various formats
    $("tr, li, p, div, article").each((_, elem) => {
      const text = $(elem).text().trim();
      if (!text || text.length < 10) return;

      // Match dates like "January 15, 2026" or "Wednesday, January 15, 2026"
      const dateMatch = text.match(/(?:(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+)?(\w+)\s+(\d{1,2}),?\s+(\d{4})/i);
      if (!dateMatch) return;

      const month = parseMonth(dateMatch[2]);
      if (month === -1) return;

      const day = parseInt(dateMatch[3]);
      const year = parseInt(dateMatch[4]);
      const meetingDate = new Date(year, month, day);

      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
      if (meetingDate < now || meetingDate > sixMonthsLater) return;

      // Find committee/meeting name
      let meetingName = "";

      // Try to find meeting name in the text before the date
      const nameMatch = text.match(/^([A-Z][A-Za-z,\s&]+?)(?:\s+[-–]|\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))/i);
      if (nameMatch) {
        meetingName = nameMatch[1].trim();
      }

      // Or look for common patterns
      if (!meetingName) {
        const patterns = [
          /(Full Board|General Board|Board Meeting)/i,
          /(Executive Committee)/i,
          /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+Committee)/i,
          /(Land Use|Transportation|Parks|Public Safety|Housing|Health)/i
        ];
        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) {
            meetingName = match[1];
            break;
          }
        }
      }

      if (!meetingName || meetingName.length < 3) return;

      // Clean up the name
      meetingName = `CB${board.id}: ${meetingName}`;

      const dateStr = formatDate(year, month, day);
      const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
      const time = timeMatch ? parseTime(timeMatch[1]) : "18:30";

      // Avoid duplicates
      if (meetings.find(m => m.date === dateStr && m.title === meetingName)) return;

      meetings.push(createMeeting(board.id, meetingName, dateStr, time, `Brooklyn CB${board.id} Office`, board.url, "brooklyn"));
    });
  } catch (err) {
    console.error(`Error scraping ${board.name}:`, err.message);
  }

  return meetings.filter(Boolean);
}

/**
 * Scrape Brooklyn boards from cbbrooklyn.cityofnewyork.us (CB2, CB10, CB17)
 */
async function scrapeCBBrooklyn(board) {
  const meetings = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  try {
    for (let monthOffset = 0; monthOffset <= 2; monthOffset++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;

      const calendarUrl = board.url.includes("/events/")
        ? `${board.url}${year}-${String(month).padStart(2, "0")}/`
        : board.url;

      try {
        const html = await fetchHTML(calendarUrl);
        const $ = cheerio.load(html);

        // Parse tribe events calendar (similar to cbmanhattan sites)
        $(".tribe-events-calendar-list__event-row, .tribe-common-g-row, .type-tribe_events, article").each((_, elem) => {
          const $elem = $(elem);
          const title = $elem.find("h3, .tribe-events-calendar-list__event-title a, .tribe-event-url").first().text().trim();
          if (!title || title.length < 3) return;

          const dateText = $elem.find("time, .tribe-events-calendar-list__event-datetime, .tribe-event-date-start").first().text().trim();
          const dateMatch = dateText.match(/(\w+)\s+(\d{1,2})(?:,?\s+(\d{4}))?/);
          if (!dateMatch) return;

          const monthNum = parseMonth(dateMatch[1]);
          if (monthNum === -1) return;

          const day = parseInt(dateMatch[2]);
          const eventYear = dateMatch[3] ? parseInt(dateMatch[3]) : year;
          const meetingDate = new Date(eventYear, monthNum, day);

          if (meetingDate < now) return;

          const dateStr = formatDate(eventYear, monthNum, day);

          const timeMatch = dateText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
          const time = timeMatch ? parseTime(timeMatch[1]) : "18:30";

          const location = $elem.find(".tribe-events-calendar-list__event-venue, .tribe-venue").first().text().trim();

          const meetingName = `CB${board.id}: ${title}`;
          meetings.push(createMeeting(board.id, meetingName, dateStr, time, location || `Brooklyn CB${board.id} Office`, board.url, "brooklyn"));
        });
      } catch (err) {
        console.error(`  Error fetching ${calendarUrl}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`Error scraping ${board.name}:`, err.message);
  }

  return meetings.filter(Boolean);
}

/**
 * Scrape Brooklyn CB6 from brooklyncb6.cityofnewyork.us
 */
async function scrapeCB6Brooklyn(board) {
  const meetings = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const seenMeetings = new Set();

  try {
    const html = await fetchHTML(board.url);
    const $ = cheerio.load(html);

    // CB6 Brooklyn has a specific format with events listed
    $(".tribe-events-calendar-list__event-row, article, .event-item, li").each((_, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();

      // Match dates like "Wednesday, January 15, 2026 at 6:30 PM"
      const dateMatch = text.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(\w+)\s+(\d{1,2}),?\s+(\d{4})(?:\s+(?:at|@)\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?))?/i);
      if (!dateMatch) return;

      const month = parseMonth(dateMatch[2]);
      if (month === -1) return;

      const day = parseInt(dateMatch[3]);
      const year = parseInt(dateMatch[4]);
      const meetingDate = new Date(year, month, day);

      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
      if (meetingDate < now || meetingDate > sixMonthsLater) return;

      // Find meeting title
      let meetingName = "";
      const titleElem = $elem.find("h3, .tribe-events-calendar-list__event-title a, a").first();
      if (titleElem.length) {
        meetingName = titleElem.text().trim();
      }

      if (!meetingName) {
        // Try to extract from text before the date
        const nameMatch = text.match(/^([A-Z][A-Za-z,\s&]+?)(?:\s+[-–]|\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))/i);
        if (nameMatch) meetingName = nameMatch[1].trim();
      }

      if (!meetingName || meetingName.length < 3) return;

      // Skip invalid titles
      if (!isValidMeetingTitle(meetingName)) return;

      meetingName = `CB6: ${meetingName}`;
      const dateStr = formatDate(year, month, day);
      const time = dateMatch[5] ? parseTime(dateMatch[5]) : "18:30";

      const key = `${dateStr}-${meetingName}`;
      if (seenMeetings.has(key)) return;
      seenMeetings.add(key);

      meetings.push(createMeeting(6, meetingName, dateStr, time, "250 Baltic Street, Brooklyn, NY 11201", board.url, "brooklyn"));
    });
  } catch (err) {
    console.error(`Error scraping Brooklyn CB6:`, err.message);
  }

  return meetings.filter(Boolean);
}

/**
 * Scrape Brooklyn CB8 from brooklyncb8.org
 */
async function scrapeCB8Brooklyn(board) {
  const meetings = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  try {
    const html = await fetchHTML(board.url);
    const $ = cheerio.load(html);

    $("article, .event, .tribe-events-calendar-list__event-row, li, tr").each((_, elem) => {
      const text = $(elem).text().trim();

      // Match dates
      const dateMatch = text.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(\w+)\s+(\d{1,2}),?\s+(\d{4})/i);
      if (!dateMatch) return;

      const month = parseMonth(dateMatch[2]);
      if (month === -1) return;

      const day = parseInt(dateMatch[3]);
      const year = parseInt(dateMatch[4]);
      const meetingDate = new Date(year, month, day);

      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
      if (meetingDate < now || meetingDate > sixMonthsLater) return;

      // Find committee name
      let meetingName = "";
      const nameMatch = text.match(/([A-Z][A-Za-z,\s&]+Committee)/i);
      if (nameMatch) {
        meetingName = nameMatch[1].trim();
      } else {
        const altMatch = text.match(/(Full Board|General Board|Board Meeting|Executive|Land Use|Public Safety|Housing|Parks|Health|Economic|Transportation|SLA|Veterans|Seniors)/i);
        if (altMatch) meetingName = altMatch[1] + (altMatch[1].includes("Committee") || altMatch[1].includes("Board") || altMatch[1].includes("Meeting") ? "" : " Committee");
      }

      if (!meetingName || meetingName.length < 3) return;

      meetingName = `CB8: ${meetingName}`;
      const dateStr = formatDate(year, month, day);
      const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
      const time = timeMatch ? parseTime(timeMatch[1]) : "19:00";

      if (meetings.find(m => m.date === dateStr && m.title === meetingName)) return;

      meetings.push(createMeeting(8, meetingName, dateStr, time, "1291 St. Marks Avenue, Brooklyn, NY", board.url, "brooklyn"));
    });
  } catch (err) {
    console.error(`Error scraping Brooklyn CB8:`, err.message);
  }

  return meetings.filter(Boolean);
}

/**
 * Scrape Brooklyn CB11 from brooklyncb11.org
 */
async function scrapeCB11Brooklyn(board) {
  const meetings = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  try {
    const html = await fetchHTML(board.url);
    const $ = cheerio.load(html);

    // CB11 uses WordPress with meeting notices
    $("article, .entry, .post").each((_, elem) => {
      const $elem = $(elem);
      const title = $elem.find("h2 a, h3 a, .entry-title a").first().text().trim();
      const content = $elem.text();

      // Extract date from title or content
      const dateMatch = content.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(\w+)\s+(\d{1,2}),?\s+(\d{4})/i) ||
                        content.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/i);

      if (!dateMatch) return;

      let month, day, year;
      if (dateMatch[1].match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i)) {
        month = parseMonth(dateMatch[2]);
        day = parseInt(dateMatch[3]);
        year = parseInt(dateMatch[4]);
      } else {
        month = parseMonth(dateMatch[1]);
        day = parseInt(dateMatch[2]);
        year = parseInt(dateMatch[3]);
      }

      if (month === -1) return;

      const meetingDate = new Date(year, month, day);
      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
      if (meetingDate < now || meetingDate > sixMonthsLater) return;

      // Get meeting name from title
      let meetingName = title;
      if (!meetingName || meetingName.length < 3) {
        const nameMatch = content.match(/([A-Z][A-Za-z,\s&]+Committee)/i);
        if (nameMatch) meetingName = nameMatch[1];
      }

      if (!meetingName || meetingName.length < 3) return;
      if (!isValidMeetingTitle(meetingName)) return;

      meetingName = `CB11: ${meetingName}`;
      const dateStr = formatDate(year, month, day);
      const timeMatch = content.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
      const time = timeMatch ? parseTime(timeMatch[1]) : "19:00";

      if (meetings.find(m => m.date === dateStr && m.title === meetingName)) return;

      meetings.push(createMeeting(11, meetingName, dateStr, time, "2214 Bath Avenue, Brooklyn, NY", board.url, "brooklyn"));
    });
  } catch (err) {
    console.error(`Error scraping Brooklyn CB11:`, err.message);
  }

  return meetings.filter(Boolean);
}

/**
 * Scrape Brooklyn CB14 from cb14brooklyn.com
 */
async function scrapeCB14Brooklyn(board) {
  const meetings = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  try {
    const html = await fetchHTML(board.url);
    const $ = cheerio.load(html);

    // CB14 uses a meeting listing format
    $("article, .event, .meeting-item, li, tr, p").each((_, elem) => {
      const text = $(elem).text().trim();

      // Match dates
      const dateMatch = text.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(\w+)\s+(\d{1,2}),?\s+(\d{4})/i);
      if (!dateMatch) return;

      const month = parseMonth(dateMatch[2]);
      if (month === -1) return;

      const day = parseInt(dateMatch[3]);
      const year = parseInt(dateMatch[4]);
      const meetingDate = new Date(year, month, day);

      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
      if (meetingDate < now || meetingDate > sixMonthsLater) return;

      // Find meeting name
      let meetingName = "";
      const nameMatch = text.match(/([A-Z][A-Za-z,\s&]+(?:Committee|Meeting|Board))/i);
      if (nameMatch) {
        meetingName = nameMatch[1].trim();
      }

      if (!meetingName || meetingName.length < 3) return;
      if (!isValidMeetingTitle(meetingName)) return;

      meetingName = `CB14: ${meetingName}`;
      const dateStr = formatDate(year, month, day);
      const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
      const time = timeMatch ? parseTime(timeMatch[1]) : "18:30";

      if (meetings.find(m => m.date === dateStr && m.title === meetingName)) return;

      meetings.push(createMeeting(14, meetingName, dateStr, time, "810 East 16th Street, Brooklyn, NY", board.url, "brooklyn"));
    });
  } catch (err) {
    console.error(`Error scraping Brooklyn CB14:`, err.message);
  }

  return meetings.filter(Boolean);
}

/**
 * Check if a meeting title is valid (not garbage HTML text)
 */
function isValidMeetingTitle(title) {
  if (!title || title.length < 3) return false;

  const garbage = [
    "event views", "navigation", "share print", "calendar of meeting",
    "click here", "view calendar", "subscribe", "register", "zoom",
    "read more", "learn more", "view details", "add to calendar",
    "previous", "next month", "next »", "« prev", "back", "home", "menu", "search",
    "print calendar", "share this", "export", "ical", "google calendar",
    "outlook", "download", "rss feed", "loading", "no events"
  ];

  const lower = title.toLowerCase();
  for (const g of garbage) {
    if (lower.includes(g)) return false;
  }

  // Must contain letters
  if (!/[a-zA-Z]/.test(title)) return false;

  // Not too long (likely garbage)
  if (title.length > 150) return false;

  return true;
}

/**
 * Generate recurring meetings for Brooklyn boards with fixed schedules
 */
function generateBrooklynRecurringMeetings(boardId, committees, location, url) {
  const meetings = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  for (let monthOffset = 0; monthOffset <= 6; monthOffset++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    // Skip July and August (most boards don't meet)
    if (month === 6 || month === 7) continue;

    for (const committee of committees) {
      const meetingDate = getNthWeekday(year, month, committee.weekday, committee.nth);

      if (meetingDate >= now && meetingDate <= sixMonthsLater) {
        const dateStr = formatDate(year, month, meetingDate.getDate());
        const meetingName = `CB${boardId}: ${committee.name}`;
        meetings.push(createMeeting(boardId, meetingName, dateStr, committee.time, location, url, "brooklyn"));
      }
    }
  }

  return meetings.filter(Boolean);
}

/**
 * Scrape all Brooklyn community boards
 */
async function scrapeBrooklynCBs() {
  const allMeetings = [];

  for (const board of BROOKLYN_BOARDS) {
    console.log(`Scraping ${board.name}...`);

    let meetings = [];
    try {
      switch (board.type) {
        case "nyc-gov":
          meetings = await scrapeBrooklynNYCGov(board);
          break;
        case "cbbrooklyn":
          meetings = await scrapeCBBrooklyn(board);
          break;
        case "cb6brooklyn":
          meetings = await scrapeCB6Brooklyn(board);
          break;
        case "cb8brooklyn":
          meetings = await scrapeCB8Brooklyn(board);
          break;
        case "cb11brooklyn":
          meetings = await scrapeCB11Brooklyn(board);
          break;
        case "cb14brooklyn":
          meetings = await scrapeCB14Brooklyn(board);
          break;
        default:
          console.log(`  Unknown type: ${board.type}`);
      }

      // If scraping didn't find many meetings, generate recurring ones as fallback
      if (meetings.length < 2) {
        console.log(`  Low results (${meetings.length}), generating recurring meetings...`);
        const fallbackMeetings = generateBrooklynRecurringMeetings(
          board.id,
          [
            { name: "Full Board Meeting", weekday: board.id <= 9 ? 3 : 2, nth: board.id <= 9 ? 3 : 4, time: "19:00" },
            { name: "Executive Committee", weekday: 3, nth: 1, time: "18:30" }
          ],
          `Brooklyn CB${board.id} Office`,
          board.url
        );
        meetings.push(...fallbackMeetings);
      }

      console.log(`  Found ${meetings.length} meetings`);
      allMeetings.push(...meetings);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }
  }

  console.log(`Brooklyn CB scraper found ${allMeetings.length} total meetings`);
  return allMeetings;
}

/**
 * Scrape all Manhattan community boards
 */
async function scrapeManhattanCBs() {
  const allMeetings = [];

  for (const board of MANHATTAN_BOARDS) {
    console.log(`Scraping ${board.name}...`);

    let meetings = [];
    try {
      switch (board.type) {
        case "cbmanhattan":
          meetings = await scrapeCBManhattan(board);
          break;
        case "nyc-gov-cb1":
          meetings = await scrapeCB1();
          break;
        case "nyc-gov-cb3":
          meetings = await scrapeCB3();
          break;
        case "cb5":
          meetings = generateCB5Meetings();
          break;
        case "cbsix":
          meetings = await scrapeCB6();
          break;
        case "mcb7":
          meetings = generateCB7Meetings();
          break;
        case "cb8m":
          meetings = await scrapeCB8();
          break;
        case "cb9m":
          meetings = generateCB9Meetings();
          break;
        case "cb11m":
          meetings = generateCB11Meetings();
          break;
        default:
          console.log(`  Unknown type: ${board.type}`);
      }

      console.log(`  Found ${meetings.length} meetings`);
      allMeetings.push(...meetings);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }
  }

  console.log(`Manhattan CB scraper found ${allMeetings.length} total meetings`);
  return allMeetings;
}

// ==================== QUEENS SCRAPERS ====================

/**
 * Scrape Queens boards from nyc.gov sites
 */
async function scrapeQueensNYCGov(board) {
  const meetings = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  try {
    const html = await fetchHTML(board.url);
    const $ = cheerio.load(html);

    // NYC.gov calendars have various formats
    $("tr, li, p, div, article").each((_, elem) => {
      const text = $(elem).text().trim();
      if (!text || text.length < 10) return;

      // Match dates like "January 15, 2026" or "Wednesday, January 15, 2026"
      const dateMatch = text.match(/(?:(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+)?(\w+)\s+(\d{1,2}),?\s+(\d{4})/i);
      if (!dateMatch) return;

      const month = parseMonth(dateMatch[2]);
      if (month === -1) return;

      const day = parseInt(dateMatch[3]);
      const year = parseInt(dateMatch[4]);
      const meetingDate = new Date(year, month, day);

      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
      if (meetingDate < now || meetingDate > sixMonthsLater) return;

      // Find committee/meeting name
      let meetingName = "";

      // Try to find meeting name in the text before the date
      const nameMatch = text.match(/^([A-Z][A-Za-z,\s&]+?)(?:\s+[-–]|\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))/i);
      if (nameMatch) {
        meetingName = nameMatch[1].trim();
      }

      // Or look for common patterns
      if (!meetingName) {
        const patterns = [
          /(Full Board|General Board|Board Meeting|Monthly Meeting)/i,
          /(Executive Committee)/i,
          /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+Committee)/i,
          /(Land Use|Transportation|Parks|Public Safety|Housing|Health|Zoning|Environment)/i
        ];
        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) {
            meetingName = match[1];
            break;
          }
        }
      }

      if (!meetingName || meetingName.length < 3) return;
      if (!isValidMeetingTitle(meetingName)) return;

      // Clean up the name
      meetingName = `CB${board.id}: ${meetingName}`;

      const dateStr = formatDate(year, month, day);
      const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
      const time = timeMatch ? parseTime(timeMatch[1]) : "19:00";

      // Avoid duplicates
      if (meetings.find(m => m.date === dateStr && m.title === meetingName)) return;

      meetings.push(createMeeting(board.id, meetingName, dateStr, time, `Queens CB${board.id} Office`, board.url, "queens"));
    });
  } catch (err) {
    console.error(`Error scraping ${board.name}:`, err.message);
  }

  return meetings.filter(Boolean);
}

/**
 * Scrape Queens CB3 from queenscb3.cityofnewyork.us
 */
async function scrapeQueensCB3(board) {
  const meetings = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  try {
    for (let monthOffset = 0; monthOffset <= 2; monthOffset++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;

      const calendarUrl = `${board.url}${year}-${String(month).padStart(2, "0")}/`;

      try {
        const html = await fetchHTML(calendarUrl);
        const $ = cheerio.load(html);

        // Parse tribe events calendar (similar to cbmanhattan sites)
        $(".tribe-events-calendar-list__event-row, .tribe-common-g-row, .type-tribe_events, article").each((_, elem) => {
          const $elem = $(elem);
          const title = $elem.find("h3, .tribe-events-calendar-list__event-title a, .tribe-event-url").first().text().trim();
          if (!title || title.length < 3) return;

          const dateText = $elem.find("time, .tribe-events-calendar-list__event-datetime, .tribe-event-date-start").first().text().trim();
          const dateMatch = dateText.match(/(\w+)\s+(\d{1,2})(?:,?\s+(\d{4}))?/);
          if (!dateMatch) return;

          const monthNum = parseMonth(dateMatch[1]);
          if (monthNum === -1) return;

          const day = parseInt(dateMatch[2]);
          const eventYear = dateMatch[3] ? parseInt(dateMatch[3]) : year;
          const meetingDate = new Date(eventYear, monthNum, day);

          if (meetingDate < now) return;

          const dateStr = formatDate(eventYear, monthNum, day);

          const timeMatch = dateText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
          const time = timeMatch ? parseTime(timeMatch[1]) : "19:30";

          const location = $elem.find(".tribe-events-calendar-list__event-venue, .tribe-venue").first().text().trim();

          const meetingName = `CB3: ${title}`;
          meetings.push(createMeeting(3, meetingName, dateStr, time, location || "Queens CB3 Office", board.url, "queens"));
        });
      } catch (err) {
        console.error(`  Error fetching ${calendarUrl}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`Error scraping Queens CB3:`, err.message);
  }

  return meetings.filter(Boolean);
}

/**
 * Generate recurring meetings for Queens boards with fixed schedules
 */
function generateQueensRecurringMeetings(boardId, committees, location, url) {
  const meetings = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  for (let monthOffset = 0; monthOffset <= 6; monthOffset++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    // Skip July and August (most boards don't meet)
    if (month === 6 || month === 7) continue;

    for (const committee of committees) {
      const meetingDate = getNthWeekday(year, month, committee.weekday, committee.nth);

      if (meetingDate >= now && meetingDate <= sixMonthsLater) {
        const dateStr = formatDate(year, month, meetingDate.getDate());
        const meetingName = `CB${boardId}: ${committee.name}`;
        meetings.push(createMeeting(boardId, meetingName, dateStr, committee.time, location, url, "queens"));
      }
    }
  }

  return meetings.filter(Boolean);
}

/**
 * Scrape all Queens community boards
 */
async function scrapeQueensCBs() {
  const allMeetings = [];

  // Queens board meeting schedules (for fallback generation)
  const queensBoardSchedules = {
    1: { weekday: 2, nth: 3, time: "18:30" },  // 3rd Tuesday at 6:30pm
    2: { weekday: 2, nth: 2, time: "19:00" },  // 2nd Tuesday at 7pm
    3: { weekday: 4, nth: 3, time: "19:30" },  // 3rd Thursday at 7:30pm
    4: { weekday: 2, nth: 2, time: "19:00" },  // 2nd Tuesday at 7pm
    5: { weekday: 3, nth: 2, time: "19:30" },  // 2nd Wednesday at 7:30pm
    6: { weekday: 3, nth: 2, time: "19:45" },  // 2nd Wednesday at 7:45pm
    7: { weekday: 1, nth: 2, time: "19:00" },  // 2nd Monday at 7pm
    8: { weekday: 3, nth: 2, time: "19:30" },  // 2nd Wednesday at 7:30pm
    9: { weekday: 2, nth: 2, time: "19:15" },  // 2nd Tuesday at 7:15pm
    10: { weekday: 4, nth: 1, time: "19:00" }, // 1st Thursday at 7pm
    11: { weekday: 1, nth: 1, time: "19:30" }, // 1st Monday at 7:30pm
    12: { weekday: 3, nth: 3, time: "19:00" }, // 3rd Wednesday at 7pm
    13: { weekday: 1, nth: 4, time: "19:30" }, // 4th Monday at 7:30pm
    14: { weekday: 2, nth: 2, time: "19:00" }  // 2nd Tuesday at 7pm
  };

  for (const board of QUEENS_BOARDS) {
    console.log(`Scraping ${board.name}...`);

    let meetings = [];
    try {
      switch (board.type) {
        case "nyc-gov-queens":
          meetings = await scrapeQueensNYCGov(board);
          break;
        case "queenscb3":
          meetings = await scrapeQueensCB3(board);
          break;
        default:
          console.log(`  Unknown type: ${board.type}`);
      }

      // If scraping didn't find many meetings, generate recurring ones as fallback
      if (meetings.length < 2) {
        console.log(`  Low results (${meetings.length}), generating recurring meetings...`);
        const schedule = queensBoardSchedules[board.id];
        const fallbackMeetings = generateQueensRecurringMeetings(
          board.id,
          [
            { name: "Full Board Meeting", weekday: schedule.weekday, nth: schedule.nth, time: schedule.time },
            { name: "Executive Committee", weekday: 3, nth: 1, time: "18:30" }
          ],
          `Queens CB${board.id} Office`,
          board.url
        );
        meetings.push(...fallbackMeetings);
      }

      console.log(`  Found ${meetings.length} meetings`);
      allMeetings.push(...meetings);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }
  }

  console.log(`Queens CB scraper found ${allMeetings.length} total meetings`);
  return allMeetings;
}

// ==================== BRONX SCRAPERS ====================

/**
 * Scrape Bronx boards from nyc.gov sites
 */
async function scrapeBronxNYCGov(board) {
  const meetings = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  try {
    const html = await fetchHTML(board.url);
    const $ = cheerio.load(html);

    $("tr, li, p, div, article").each((_, elem) => {
      const text = $(elem).text().trim();
      if (!text || text.length < 10) return;

      const dateMatch = text.match(/(?:(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+)?(\w+)\s+(\d{1,2}),?\s+(\d{4})/i);
      if (!dateMatch) return;

      const month = parseMonth(dateMatch[2]);
      if (month === -1) return;

      const day = parseInt(dateMatch[3]);
      const year = parseInt(dateMatch[4]);
      const meetingDate = new Date(year, month, day);

      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
      if (meetingDate < now || meetingDate > sixMonthsLater) return;

      let meetingName = "";
      const nameMatch = text.match(/^([A-Z][A-Za-z,\s&]+?)(?:\s+[-–]|\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))/i);
      if (nameMatch) {
        meetingName = nameMatch[1].trim();
      }

      if (!meetingName) {
        const patterns = [
          /(Full Board|General Board|Board Meeting|Monthly Meeting)/i,
          /(Executive Committee)/i,
          /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+Committee)/i,
          /(Land Use|Transportation|Parks|Public Safety|Housing|Health|Zoning|Environment)/i
        ];
        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) {
            meetingName = match[1];
            break;
          }
        }
      }

      if (!meetingName || meetingName.length < 3) return;
      if (!isValidMeetingTitle(meetingName)) return;

      meetingName = `CB${board.id}: ${meetingName}`;

      const dateStr = formatDate(year, month, day);
      const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
      const time = timeMatch ? parseTime(timeMatch[1]) : "18:00";

      if (meetings.find(m => m.date === dateStr && m.title === meetingName)) return;

      meetings.push(createMeeting(board.id, meetingName, dateStr, time, `Bronx CB${board.id} Office`, board.url, "bronx"));
    });
  } catch (err) {
    console.error(`Error scraping ${board.name}:`, err.message);
  }

  return meetings.filter(Boolean);
}

/**
 * Scrape Bronx boards from cbbronx.cityofnewyork.us (CB6, CB8)
 */
async function scrapeCBBronx(board) {
  const meetings = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  try {
    for (let monthOffset = 0; monthOffset <= 2; monthOffset++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;

      const calendarUrl = `${board.url}${year}-${String(month).padStart(2, "0")}/`;

      try {
        const html = await fetchHTML(calendarUrl);
        const $ = cheerio.load(html);

        $(".tribe-events-calendar-list__event-row, .tribe-common-g-row, .type-tribe_events, article").each((_, elem) => {
          const $elem = $(elem);
          const title = $elem.find("h3, .tribe-events-calendar-list__event-title a, .tribe-event-url").first().text().trim();
          if (!title || title.length < 3) return;

          const dateText = $elem.find("time, .tribe-events-calendar-list__event-datetime, .tribe-event-date-start").first().text().trim();
          const dateMatch = dateText.match(/(\w+)\s+(\d{1,2})(?:,?\s+(\d{4}))?/);
          if (!dateMatch) return;

          const monthNum = parseMonth(dateMatch[1]);
          if (monthNum === -1) return;

          const day = parseInt(dateMatch[2]);
          const eventYear = dateMatch[3] ? parseInt(dateMatch[3]) : year;
          const meetingDate = new Date(eventYear, monthNum, day);

          if (meetingDate < now) return;

          const dateStr = formatDate(eventYear, monthNum, day);
          const timeMatch = dateText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
          const time = timeMatch ? parseTime(timeMatch[1]) : "18:30";

          const location = $elem.find(".tribe-events-calendar-list__event-venue, .tribe-venue").first().text().trim();

          const meetingName = `CB${board.id}: ${title}`;
          meetings.push(createMeeting(board.id, meetingName, dateStr, time, location || `Bronx CB${board.id} Office`, board.url, "bronx"));
        });
      } catch (err) {
        console.error(`  Error fetching ${calendarUrl}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`Error scraping ${board.name}:`, err.message);
  }

  return meetings.filter(Boolean);
}

/**
 * Generate recurring meetings for Bronx boards
 */
function generateBronxRecurringMeetings(boardId, committees, location, url) {
  const meetings = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  for (let monthOffset = 0; monthOffset <= 6; monthOffset++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    if (month === 6 || month === 7) continue;

    for (const committee of committees) {
      let meetingDate;
      if (committee.last) {
        // Get last weekday of month
        const lastDay = new Date(year, month + 1, 0);
        let day = lastDay.getDate();
        while (new Date(year, month, day).getDay() !== committee.weekday) {
          day--;
        }
        meetingDate = new Date(year, month, day);
      } else {
        meetingDate = getNthWeekday(year, month, committee.weekday, committee.nth);
      }

      if (meetingDate >= now && meetingDate <= sixMonthsLater) {
        const dateStr = formatDate(year, month, meetingDate.getDate());
        const meetingName = `CB${boardId}: ${committee.name}`;
        meetings.push(createMeeting(boardId, meetingName, dateStr, committee.time, location, url, "bronx"));
      }
    }
  }

  return meetings.filter(Boolean);
}

/**
 * Scrape all Bronx community boards
 */
async function scrapeBronxCBs() {
  const allMeetings = [];

  // Bronx board meeting schedules (for fallback generation)
  const bronxBoardSchedules = {
    1: { weekday: 4, last: true, time: "18:00" },   // Last Thursday at 6pm
    2: { weekday: 3, last: true, time: "18:00" },   // Last Wednesday at 6pm
    3: { weekday: 2, nth: 2, time: "18:00" },       // 2nd Tuesday at 6pm
    4: { weekday: 2, nth: 4, time: "18:00" },       // 4th Tuesday at 6pm
    5: { weekday: 3, nth: 4, time: "18:00" },       // 4th Wednesday at 6pm
    6: { weekday: 3, nth: 3, time: "18:30" },       // 3rd Wednesday at 6:30pm
    7: { weekday: 1, nth: 3, time: "18:30" },       // 3rd Monday at 6:30pm
    8: { weekday: 2, nth: 2, time: "19:00" },       // 2nd Tuesday at 7pm
    9: { weekday: 4, nth: 3, time: "18:30" },       // 3rd Thursday at 6:30pm
    10: { weekday: 4, nth: 3, time: "19:00" },      // 3rd Thursday at 7pm
    11: { weekday: 4, nth: 4, time: "19:00" },      // 4th Thursday at 7pm
    12: { weekday: 4, nth: 4, time: "18:00" }       // 4th Thursday at 6pm
  };

  for (const board of BRONX_BOARDS) {
    console.log(`Scraping ${board.name}...`);

    let meetings = [];
    try {
      switch (board.type) {
        case "nyc-gov-bronx":
          meetings = await scrapeBronxNYCGov(board);
          break;
        case "cbbronx":
          meetings = await scrapeCBBronx(board);
          break;
        default:
          console.log(`  Unknown type: ${board.type}`);
      }

      if (meetings.length < 2) {
        console.log(`  Low results (${meetings.length}), generating recurring meetings...`);
        const schedule = bronxBoardSchedules[board.id];
        const fallbackMeetings = generateBronxRecurringMeetings(
          board.id,
          [
            { name: "Full Board Meeting", weekday: schedule.weekday, nth: schedule.nth, last: schedule.last, time: schedule.time },
            { name: "Executive Committee", weekday: 2, nth: 1, time: "10:00" }
          ],
          `Bronx CB${board.id} Office`,
          board.url
        );
        meetings.push(...fallbackMeetings);
      }

      console.log(`  Found ${meetings.length} meetings`);
      allMeetings.push(...meetings);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }
  }

  console.log(`Bronx CB scraper found ${allMeetings.length} total meetings`);
  return allMeetings;
}

// ==================== STATEN ISLAND SCRAPERS ====================

/**
 * Scrape Staten Island boards from nyc.gov sites
 */
async function scrapeStatenIslandNYCGov(board) {
  const meetings = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  try {
    const html = await fetchHTML(board.url);
    const $ = cheerio.load(html);

    $("tr, li, p, div, article").each((_, elem) => {
      const text = $(elem).text().trim();
      if (!text || text.length < 10) return;

      const dateMatch = text.match(/(?:(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+)?(\w+)\s+(\d{1,2}),?\s+(\d{4})/i);
      if (!dateMatch) return;

      const month = parseMonth(dateMatch[2]);
      if (month === -1) return;

      const day = parseInt(dateMatch[3]);
      const year = parseInt(dateMatch[4]);
      const meetingDate = new Date(year, month, day);

      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
      if (meetingDate < now || meetingDate > sixMonthsLater) return;

      let meetingName = "";
      const nameMatch = text.match(/^([A-Z][A-Za-z,\s&]+?)(?:\s+[-–]|\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))/i);
      if (nameMatch) {
        meetingName = nameMatch[1].trim();
      }

      if (!meetingName) {
        const patterns = [
          /(Full Board|General Board|Board Meeting|Monthly Meeting)/i,
          /(Executive Committee)/i,
          /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+Committee)/i,
          /(Land Use|Transportation|Parks|Public Safety|Housing|Health|Zoning|Environment)/i
        ];
        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) {
            meetingName = match[1];
            break;
          }
        }
      }

      if (!meetingName || meetingName.length < 3) return;
      if (!isValidMeetingTitle(meetingName)) return;

      meetingName = `CB${board.id}: ${meetingName}`;

      const dateStr = formatDate(year, month, day);
      const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
      const time = timeMatch ? parseTime(timeMatch[1]) : "19:00";

      if (meetings.find(m => m.date === dateStr && m.title === meetingName)) return;

      meetings.push(createMeeting(board.id, meetingName, dateStr, time, `Staten Island CB${board.id} Office`, board.url, "staten-island"));
    });
  } catch (err) {
    console.error(`Error scraping ${board.name}:`, err.message);
  }

  return meetings.filter(Boolean);
}

/**
 * Generate recurring meetings for Staten Island boards
 */
function generateStatenIslandRecurringMeetings(boardId, committees, location, url) {
  const meetings = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  for (let monthOffset = 0; monthOffset <= 6; monthOffset++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    if (month === 6 || month === 7) continue;

    for (const committee of committees) {
      const meetingDate = getNthWeekday(year, month, committee.weekday, committee.nth);

      if (meetingDate >= now && meetingDate <= sixMonthsLater) {
        const dateStr = formatDate(year, month, meetingDate.getDate());
        const meetingName = `CB${boardId}: ${committee.name}`;
        meetings.push(createMeeting(boardId, meetingName, dateStr, committee.time, location, url, "staten-island"));
      }
    }
  }

  return meetings.filter(Boolean);
}

/**
 * Scrape all Staten Island community boards
 */
async function scrapeStatenIslandCBs() {
  const allMeetings = [];

  // Staten Island board meeting schedules
  const siBoardSchedules = {
    1: { weekday: 2, nth: 2, time: "18:30" },  // 2nd Tuesday at 6:30pm
    2: { weekday: 2, nth: 3, time: "19:00" },  // 3rd Tuesday at 7pm
    3: { weekday: 2, nth: 4, time: "19:30" }   // 4th Tuesday at 7:30pm
  };

  for (const board of STATEN_ISLAND_BOARDS) {
    console.log(`Scraping ${board.name}...`);

    let meetings = [];
    try {
      meetings = await scrapeStatenIslandNYCGov(board);

      if (meetings.length < 2) {
        console.log(`  Low results (${meetings.length}), generating recurring meetings...`);
        const schedule = siBoardSchedules[board.id];
        const fallbackMeetings = generateStatenIslandRecurringMeetings(
          board.id,
          [
            { name: "Full Board Meeting", weekday: schedule.weekday, nth: schedule.nth, time: schedule.time },
            { name: "Executive Committee", weekday: 2, nth: 1, time: "19:00" }
          ],
          `Staten Island CB${board.id} Office`,
          board.url
        );
        meetings.push(...fallbackMeetings);
      }

      console.log(`  Found ${meetings.length} meetings`);
      allMeetings.push(...meetings);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }
  }

  console.log(`Staten Island CB scraper found ${allMeetings.length} total meetings`);
  return allMeetings;
}

module.exports = {
  scrapeManhattanCBs,
  scrapeBrooklynCBs,
  scrapeQueensCBs,
  scrapeBronxCBs,
  scrapeStatenIslandCBs,
  MANHATTAN_BOARDS,
  BROOKLYN_BOARDS,
  QUEENS_BOARDS,
  BRONX_BOARDS,
  STATEN_ISLAND_BOARDS
};

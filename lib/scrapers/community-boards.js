// Community Boards Scraper
// Scrapes meeting data from Manhattan Community Boards

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
 * Create a meeting object
 */
function createMeeting(boardId, title, dateStr, time, location, url) {
  const cleanTitle = title.replace(/\s+/g, " ").trim();
  const id = `cb-mn${boardId}-${dateStr}-${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 40)}`;
  return {
    id,
    org: `community-boards.manhattan.${boardId}`,
    title: cleanTitle,
    date: dateStr,
    time: time || "18:30",
    location: location || `Community Board ${boardId} Office`,
    description: `Manhattan Community Board ${boardId}`,
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

  return meetings;
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

  return meetings;
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

  return meetings;
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

  return meetings;
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

  return meetings;
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

  return meetings;
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

module.exports = {
  scrapeManhattanCBs,
  MANHATTAN_BOARDS
};

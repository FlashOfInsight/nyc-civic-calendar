// Community Boards Scraper
// Scrapes meeting data from Manhattan Community Boards

const https = require("https");
const cheerio = require("cheerio");

// Manhattan Community Board configurations
const MANHATTAN_BOARDS = [
  {
    id: 1,
    name: "CB1 Manhattan",
    neighborhoods: "Financial District, Battery Park City, Tribeca",
    url: "https://www.nyc.gov/site/manhattancb1/meetings/committee-agendas.page",
    type: "nyc-gov"
  },
  {
    id: 2,
    name: "CB2 Manhattan",
    neighborhoods: "Greenwich Village, SoHo, NoHo",
    url: "https://cbmanhattan.cityofnewyork.us/cb2/calendar/",
    type: "cbmanhattan"
  },
  {
    id: 3,
    name: "CB3 Manhattan",
    neighborhoods: "East Village, Lower East Side, Chinatown",
    url: "https://www.nyc.gov/site/manhattancb3/calendar/calendar.page",
    type: "nyc-gov"
  },
  {
    id: 4,
    name: "CB4 Manhattan",
    neighborhoods: "Chelsea, Hell's Kitchen",
    url: "https://cbmanhattan.cityofnewyork.us/cb4/calendar/",
    type: "cbmanhattan"
  },
  {
    id: 5,
    name: "CB5 Manhattan",
    neighborhoods: "Midtown",
    url: "https://www.cb5.org/cb5m/calendar/",
    type: "external"
  },
  {
    id: 6,
    name: "CB6 Manhattan",
    neighborhoods: "Murray Hill, Gramercy Park, Stuyvesant Town",
    url: "https://cbsix.org/meetings-calendar/",
    type: "external"
  },
  {
    id: 7,
    name: "CB7 Manhattan",
    neighborhoods: "Upper West Side, Lincoln Square",
    url: "https://www.nyc.gov/site/manhattancb7/meetings/calendar.page",
    type: "nyc-gov"
  },
  {
    id: 8,
    name: "CB8 Manhattan",
    neighborhoods: "Upper East Side, Roosevelt Island",
    url: "https://www.cb8m.com/",
    type: "external"
  },
  {
    id: 9,
    name: "CB9 Manhattan",
    neighborhoods: "Morningside Heights, Hamilton Heights",
    url: "https://www.cb9m.org/",
    type: "external"
  },
  {
    id: 10,
    name: "CB10 Manhattan",
    neighborhoods: "Central Harlem",
    url: "https://cbmanhattan.cityofnewyork.us/cb10/events/",
    type: "cbmanhattan"
  },
  {
    id: 11,
    name: "CB11 Manhattan",
    neighborhoods: "East Harlem",
    url: "https://www.cb11m.org/",
    type: "external"
  },
  {
    id: 12,
    name: "CB12 Manhattan",
    neighborhoods: "Washington Heights, Inwood",
    url: "https://cbmanhattan.cityofnewyork.us/cb12/calendar/",
    type: "cbmanhattan"
  }
];

/**
 * Fetch HTML from URL with redirect handling
 */
function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : require("http");
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NYCCivicCalendar/1.0)"
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
    "january": 0, "jan": 0,
    "february": 1, "feb": 1,
    "march": 2, "mar": 2,
    "april": 3, "apr": 3,
    "may": 4,
    "june": 5, "jun": 5,
    "july": 6, "jul": 6,
    "august": 7, "aug": 7,
    "september": 8, "sep": 8, "sept": 8,
    "october": 9, "oct": 9,
    "november": 10, "nov": 10,
    "december": 11, "dec": 11
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
 * Scrape cbmanhattan.cityofnewyork.us calendar
 */
async function scrapeCBManhattan(board) {
  const meetings = [];
  const now = new Date();

  try {
    // Fetch current and next month
    for (let monthOffset = 0; monthOffset <= 2; monthOffset++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;

      const calendarUrl = board.url.includes("/events/")
        ? `${board.url}${year}-${String(month).padStart(2, "0")}/`
        : `${board.url}`;

      try {
        const html = await fetchHTML(calendarUrl);
        const $ = cheerio.load(html);

        // Look for event entries - cbmanhattan uses WordPress event calendars
        $(".tribe-events-calendar-list__event, .tribe-common-g-row, article.post, .type-tribe_events").each((_, elem) => {
          const $elem = $(elem);

          // Try various selectors for title
          const title = $elem.find(".tribe-events-calendar-list__event-title, .tribe-event-url, h3, .entry-title").first().text().trim() ||
                       $elem.find("a").first().text().trim();

          if (!title || title.length < 3) return;

          // Try to find date
          const dateText = $elem.find(".tribe-events-calendar-list__event-datetime, .tribe-event-date-start, time, .event-date").text().trim();

          // Parse date like "January 7, 2026" or "Jan 7"
          const dateMatch = dateText.match(/(\w+)\s+(\d{1,2})(?:,?\s+(\d{4}))?/);
          if (!dateMatch) return;

          const monthNum = parseMonth(dateMatch[1]);
          if (monthNum === -1) return;

          const day = parseInt(dateMatch[2]);
          const eventYear = dateMatch[3] ? parseInt(dateMatch[3]) : year;

          // Parse time
          const timeMatch = dateText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
          const time = timeMatch ? parseTime(timeMatch[1]) : "18:30";

          // Get location
          const location = $elem.find(".tribe-events-calendar-list__event-venue, .tribe-venue, .event-location").text().trim() ||
                          `Community Board ${board.id} Office`;

          const dateStr = formatDate(eventYear, monthNum, day);

          meetings.push({
            id: `cb-mn${board.id}-${dateStr}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 30)}`,
            org: `community-boards.manhattan.${board.id}`,
            title: `${title}`,
            date: dateStr,
            time: time,
            location: location,
            description: `${board.name} (${board.neighborhoods})`,
            url: board.url
          });
        });

        // Also try parsing from text content for simpler pages
        const bodyText = $("body").text();
        const datePattern = /(\w+)\s+(\d{1,2}),?\s+(\d{4})/g;
        let match;

        while ((match = datePattern.exec(bodyText)) !== null) {
          const monthNum = parseMonth(match[1]);
          if (monthNum === -1) continue;

          const day = parseInt(match[2]);
          const eventYear = parseInt(match[3]);

          if (eventYear !== year && eventYear !== year + 1) continue;

          const dateStr = formatDate(eventYear, monthNum, day);

          // Check if we already have this date
          if (meetings.find(m => m.date === dateStr)) continue;

          // Look for context around this date
          const contextStart = Math.max(0, match.index - 100);
          const contextEnd = Math.min(bodyText.length, match.index + 200);
          const context = bodyText.substring(contextStart, contextEnd);

          // Try to extract meeting name
          const meetingMatch = context.match(/([A-Z][A-Za-z\s&]+(?:Committee|Meeting|Board))/);
          if (!meetingMatch) continue;

          const meetingName = meetingMatch[1].trim();

          // Try to extract time
          const timeMatch = context.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
          const time = timeMatch ? parseTime(timeMatch[1]) : "18:30";

          meetings.push({
            id: `cb-mn${board.id}-${dateStr}-${meetingName.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 30)}`,
            org: `community-boards.manhattan.${board.id}`,
            title: meetingName,
            date: dateStr,
            time: time,
            location: `Community Board ${board.id} Office`,
            description: `${board.name} (${board.neighborhoods})`,
            url: board.url
          });
        }

      } catch (err) {
        console.error(`Error fetching ${calendarUrl}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`Error scraping ${board.name}:`, err.message);
  }

  return meetings;
}

/**
 * Scrape nyc.gov community board calendar
 */
async function scrapeNYCGov(board) {
  const meetings = [];
  const now = new Date();
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  try {
    const html = await fetchHTML(board.url);
    const $ = cheerio.load(html);

    // Parse the page content for meeting information
    // NYC.gov sites typically have tables or lists with meeting info

    // Try tables first
    $("table tr, .meeting-row, li").each((_, elem) => {
      const text = $(elem).text().trim();

      // Look for date patterns like "1/7" or "January 7" or "1/7/2026"
      const datePatterns = [
        /(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/,  // 1/7 or 1/7/2026
        /(\w+)\s+(\d{1,2})(?:,?\s+(\d{4}))?/   // January 7 or January 7, 2026
      ];

      let meetingDate = null;
      let matchResult = null;

      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          matchResult = match;
          if (pattern.source.startsWith("(\\d")) {
            // Numeric format
            const month = parseInt(match[1]) - 1;
            const day = parseInt(match[2]);
            const year = match[3] ? parseInt(match[3]) : now.getFullYear();
            meetingDate = new Date(year, month, day);
          } else {
            // Month name format
            const month = parseMonth(match[1]);
            if (month === -1) continue;
            const day = parseInt(match[2]);
            const year = match[3] ? parseInt(match[3]) : now.getFullYear();
            meetingDate = new Date(year, month, day);
          }
          break;
        }
      }

      if (!meetingDate || meetingDate < now || meetingDate > sixMonthsLater) return;

      // Extract meeting name
      let meetingName = "";
      const namePatterns = [
        /([A-Z][A-Za-z\s,&]+(?:Committee|Meeting|Board))/,
        /^([^-\d]+)/
      ];

      for (const pattern of namePatterns) {
        const match = text.match(pattern);
        if (match) {
          meetingName = match[1].trim();
          break;
        }
      }

      if (!meetingName || meetingName.length < 3) return;

      // Extract time
      const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
      const time = timeMatch ? parseTime(timeMatch[1]) : "18:00";

      // Extract location
      let location = "";
      const locationMatch = text.match(/(?:at|@|Location:)\s*([^,\n]+)/i);
      if (locationMatch) {
        location = locationMatch[1].trim();
      }

      const dateStr = formatDate(meetingDate.getFullYear(), meetingDate.getMonth(), meetingDate.getDate());

      // Avoid duplicates
      const existingId = `cb-mn${board.id}-${dateStr}`;
      if (meetings.find(m => m.id.startsWith(existingId))) return;

      meetings.push({
        id: `cb-mn${board.id}-${dateStr}-${meetingName.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 30)}`,
        org: `community-boards.manhattan.${board.id}`,
        title: meetingName,
        date: dateStr,
        time: time,
        location: location || `Community Board ${board.id} Office`,
        description: `${board.name} (${board.neighborhoods})`,
        url: board.url
      });
    });

  } catch (err) {
    console.error(`Error scraping ${board.name}:`, err.message);
  }

  return meetings;
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
      if (board.type === "cbmanhattan") {
        meetings = await scrapeCBManhattan(board);
      } else if (board.type === "nyc-gov") {
        meetings = await scrapeNYCGov(board);
      }
      // Skip external sites for now - can add later

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
  scrapeCBManhattan,
  scrapeNYCGov,
  MANHATTAN_BOARDS
};

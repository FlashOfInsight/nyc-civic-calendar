// MTA Board Meetings Scraper
// Scrapes meeting information from mta.info

const https = require("https");
const cheerio = require("cheerio");

const MTA_URL = "https://www.mta.info/transparency/board-and-committee-meetings";

// MTA meeting types to org keys
const meetingTypeToOrgKey = {
  "board": "state-authorities.mta.board",
  "regular board": "state-authorities.mta.board",
  "finance": "state-authorities.mta.finance",
  "capital": "state-authorities.mta.capital-program",
  "capital program": "state-authorities.mta.capital-program",
  "safety": "state-authorities.mta.safety",
  "audit": "state-authorities.mta.audit",
  "nyc transit": "state-authorities.mta.nyct-bus",
  "mta bus": "state-authorities.mta.nyct-bus",
  "lirr": "state-authorities.mta.lirr-mnr",
  "metro-north": "state-authorities.mta.lirr-mnr",
  "joint lirr": "state-authorities.mta.lirr-mnr",
  "bridges": "state-authorities.mta.bridges-tunnels",
  "tunnels": "state-authorities.mta.bridges-tunnels"
};

/**
 * Fetch HTML from URL
 * @param {string} url
 * @returns {Promise<string>}
 */
function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchHTML(res.headers.location).then(resolve).catch(reject);
        return;
      }

      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

/**
 * Determine org key from meeting text
 * @param {string} text
 * @returns {string}
 */
function getOrgKeyFromText(text) {
  const lower = text.toLowerCase();

  for (const [keyword, orgKey] of Object.entries(meetingTypeToOrgKey)) {
    if (lower.includes(keyword)) {
      return orgKey;
    }
  }

  // Default to board meeting
  return "state-authorities.mta.board";
}

/**
 * Parse month name to number
 * @param {string} monthName
 * @returns {number}
 */
function parseMonth(monthName) {
  const months = {
    "january": 0, "february": 1, "march": 2, "april": 3,
    "may": 4, "june": 5, "july": 6, "august": 7,
    "september": 8, "october": 9, "november": 10, "december": 11
  };
  return months[monthName.toLowerCase()] ?? -1;
}

/**
 * Scrape MTA board meetings
 * @returns {Promise<Array>} - Array of meeting objects
 */
async function scrapeMTA() {
  const meetings = [];

  try {
    const html = await fetchHTML(MTA_URL);
    const $ = cheerio.load(html);

    // The MTA page typically lists meetings by month/year
    // Look for links to individual meeting pages
    const currentYear = new Date().getFullYear();

    // Find all links to meeting pages
    $("a").each((_, elem) => {
      const href = $(elem).attr("href") || "";
      const text = $(elem).text().trim();

      // Match patterns like "January 2025" or "MTA Board Meeting, January 2025"
      const monthYearMatch = text.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i);

      if (monthYearMatch && href.includes("board-and-committee-meetings")) {
        const month = parseMonth(monthYearMatch[1]);
        const year = parseInt(monthYearMatch[2]);

        // Only include current and future meetings (within 6 months)
        const meetingDate = new Date(year, month, 15); // Approximate mid-month
        const now = new Date();
        const sixMonthsLater = new Date();
        sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

        if (meetingDate >= now && meetingDate <= sixMonthsLater) {
          // MTA meetings typically happen on the 4th week of each month
          // Committee meetings: Monday, Board meeting: Wednesday
          const fourthMonday = getNthWeekday(year, month, 1, 4); // 4th Monday
          const fourthWednesday = getNthWeekday(year, month, 3, 4); // 4th Wednesday

          // Add committee meetings (Monday)
          meetings.push({
            id: `mta-committees-${year}-${month + 1}`,
            org: "state-authorities.mta.finance", // Committees meet together
            title: `MTA Committee Meetings - ${monthYearMatch[1]} ${year}`,
            date: formatDate(fourthMonday),
            time: "09:00",
            endTime: "14:00",
            location: "MTA Board Room, 2 Broadway, 20th Floor, New York, NY",
            description: "MTA committee meetings including Finance, Capital Program, Safety, and agency committees",
            url: `https://www.mta.info${href}`
          });

          // Add board meeting (Wednesday)
          meetings.push({
            id: `mta-board-${year}-${month + 1}`,
            org: "state-authorities.mta.board",
            title: `MTA Board Meeting - ${monthYearMatch[1]} ${year}`,
            date: formatDate(fourthWednesday),
            time: "10:00",
            endTime: "13:00",
            location: "MTA Board Room, 2 Broadway, 20th Floor, New York, NY",
            description: "Regular MTA Board meeting",
            url: `https://www.mta.info${href}`
          });
        }
      }
    });

  } catch (err) {
    console.error("Error scraping MTA:", err.message);
  }

  return meetings;
}

/**
 * Get the nth occurrence of a weekday in a month
 * @param {number} year
 * @param {number} month - 0-indexed
 * @param {number} dayOfWeek - 0=Sunday, 1=Monday, etc.
 * @param {number} n - Which occurrence (1st, 2nd, etc.)
 * @returns {Date}
 */
function getNthWeekday(year, month, dayOfWeek, n) {
  const firstDay = new Date(year, month, 1);
  const firstOccurrence = 1 + ((dayOfWeek - firstDay.getDay() + 7) % 7);
  const nthDay = firstOccurrence + (n - 1) * 7;
  return new Date(year, month, nthDay);
}

/**
 * Format date as YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

module.exports = { scrapeMTA };

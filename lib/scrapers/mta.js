// MTA Board Meetings Scraper
// Scrapes meeting information from mta.info

const https = require("https");
const cheerio = require("cheerio");

const MTA_URL = "https://www.mta.info/transparency/board-and-committee-meetings";

/**
 * Fetch HTML from URL
 * @param {string} url
 * @returns {Promise<string>}
 */
function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NYCCivicCalendar/1.0)"
      }
    };

    https.get(url, options, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith("/")) {
          redirectUrl = "https://www.mta.info" + redirectUrl;
        }
        fetchHTML(redirectUrl).then(resolve).catch(reject);
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
    "january": 0, "february": 1, "march": 2, "april": 3,
    "may": 4, "june": 5, "july": 6, "august": 7,
    "september": 8, "october": 9, "november": 10, "december": 11
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
 * Scrape MTA board meetings
 * @returns {Promise<Array>} - Array of meeting objects
 */
async function scrapeMTA() {
  const meetings = [];

  try {
    const html = await fetchHTML(MTA_URL);
    const $ = cheerio.load(html);

    const now = new Date();
    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

    // Find all links that contain meeting info
    // Pattern: "January 27 and 29, 2025: MTA Committee and Regular Board Meetings"
    $("a").each((_, elem) => {
      const text = $(elem).text().trim();
      const href = $(elem).attr("href") || "";

      // Match patterns like "January 27 and 29, 2025" or "December 15 and 17, 2025"
      const dateMatch = text.match(/(\w+)\s+(\d+)\s+and\s+(\d+),\s+(\d{4})/i);

      if (dateMatch && href.includes("board-and-committee-meetings")) {
        const monthName = dateMatch[1];
        const day1 = parseInt(dateMatch[2]);
        const day2 = parseInt(dateMatch[3]);
        const year = parseInt(dateMatch[4]);
        const month = parseMonth(monthName);

        if (month === -1) return;

        const meetingDate1 = new Date(year, month, day1);
        const meetingDate2 = new Date(year, month, day2);

        // Include meetings from past 2 months to 6 months in future
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        if (meetingDate1 < twoMonthsAgo || meetingDate1 > sixMonthsLater) return;

        const fullUrl = href.startsWith("/")
          ? `https://www.mta.info${href}`
          : href;

        // Day 1: Committee meetings (typically Monday)
        meetings.push({
          id: `mta-committees-${year}-${month + 1}-${day1}`,
          org: "state-authorities.mta.finance",
          title: `MTA Committee Meetings`,
          date: formatDate(year, month, day1),
          time: "09:00",
          endTime: "14:00",
          location: "MTA Board Room, 2 Broadway, 20th Floor, New York, NY",
          description: "MTA committee meetings including Finance, Capital Program, Safety, NYC Transit, and other committees",
          url: fullUrl
        });

        // Also add individual committee entries
        const committees = [
          { id: "safety", org: "state-authorities.mta.safety", name: "Safety Committee", time: "09:00" },
          { id: "nyct", org: "state-authorities.mta.nyct-bus", name: "NYC Transit/MTA Bus Committee", time: "10:00" },
          { id: "lirr-mnr", org: "state-authorities.mta.lirr-mnr", name: "Joint LIRR/Metro-North Committee", time: "09:30" },
          { id: "capital", org: "state-authorities.mta.capital-program", name: "Capital Program Committee", time: "12:00" },
          { id: "bt", org: "state-authorities.mta.bridges-tunnels", name: "Bridges & Tunnels Committee", time: "13:00" },
        ];

        for (const committee of committees) {
          meetings.push({
            id: `mta-${committee.id}-${year}-${month + 1}-${day1}`,
            org: committee.org,
            title: committee.name,
            date: formatDate(year, month, day1),
            time: committee.time,
            location: "MTA Board Room, 2 Broadway, 20th Floor, New York, NY",
            description: `${committee.name} meeting`,
            url: fullUrl
          });
        }

        // Day 2: Board meeting (typically Wednesday)
        meetings.push({
          id: `mta-board-${year}-${month + 1}-${day2}`,
          org: "state-authorities.mta.board",
          title: "MTA Board Meeting",
          date: formatDate(year, month, day2),
          time: "10:00",
          endTime: "13:00",
          location: "MTA Board Room, 2 Broadway, 20th Floor, New York, NY",
          description: "Regular MTA Board meeting",
          url: fullUrl
        });
      }
    });

  } catch (err) {
    console.error("Error scraping MTA:", err.message);
    throw err;
  }

  console.log(`MTA scraper found ${meetings.length} meetings`);
  return meetings;
}

module.exports = { scrapeMTA };

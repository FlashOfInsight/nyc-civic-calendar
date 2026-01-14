// NYC Agencies Scraper
// Scrapes DOB events and DOE Panel for Educational Policy meetings

const https = require("https");
const cheerio = require("cheerio");

const DOB_URL = "https://www.nyc.gov/site/buildings/dob/upcoming-events.page";
const DOE_PEP_URL = "https://www.schools.nyc.gov/get-involved/families/panel-for-education-policy/panel-meetings";

/**
 * Fetch HTML from URL
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
          const urlObj = new URL(url);
          redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
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
 * Get Nth weekday of a month
 * @param {number} year
 * @param {number} month - 0-indexed
 * @param {number} weekday - 0=Sunday, 1=Monday, etc.
 * @param {number} n - 1st, 2nd, 3rd, 4th
 */
function getNthWeekday(year, month, weekday, n) {
  const firstDay = new Date(year, month, 1);
  let dayOfWeek = firstDay.getDay();
  let diff = weekday - dayOfWeek;
  if (diff < 0) diff += 7;
  const firstOccurrence = 1 + diff;
  const nthDay = firstOccurrence + (n - 1) * 7;
  return new Date(year, month, nthDay);
}

/**
 * Scrape DOB events
 */
async function scrapeDOB() {
  const meetings = [];
  const now = new Date();
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  try {
    const html = await fetchHTML(DOB_URL);
    const $ = cheerio.load(html);

    // Look for Q&A sessions in tables
    $("table").each((_, table) => {
      $(table).find("tr").each((_, row) => {
        const cells = $(row).find("td");
        if (cells.length >= 2) {
          const text1 = $(cells[0]).text().trim();
          const text2 = $(cells[1]).text().trim();

          // Try to parse "Borough | Date | Time" pattern
          // Pattern: "Queens" "Tuesday, January 6" "2:00 PM – 3:30 PM"
          const dateMatch = text2.match(/(\w+),\s+(\w+)\s+(\d+)/i);
          if (dateMatch) {
            const monthName = dateMatch[2];
            const day = parseInt(dateMatch[3]);
            const month = parseMonth(monthName);

            if (month !== -1) {
              // Determine year (current or next)
              let year = now.getFullYear();
              const testDate = new Date(year, month, day);
              if (testDate < new Date(now.getFullYear(), now.getMonth() - 1, 1)) {
                year++;
              }

              const meetingDate = new Date(year, month, day);
              if (meetingDate >= now && meetingDate <= sixMonthsLater) {
                // Parse time from third cell if exists
                const timeCell = cells.length >= 3 ? $(cells[2]).text().trim() : "";
                const timeMatch = timeCell.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                let time = null;
                if (timeMatch) {
                  let hours = parseInt(timeMatch[1]);
                  const minutes = timeMatch[2];
                  const ampm = timeMatch[3].toUpperCase();
                  if (ampm === "PM" && hours < 12) hours += 12;
                  if (ampm === "AM" && hours === 12) hours = 0;
                  time = `${String(hours).padStart(2, "0")}:${minutes}`;
                }

                meetings.push({
                  id: `dob-qa-${text1.toLowerCase().replace(/\s+/g, "-")}-${year}-${month + 1}-${day}`,
                  org: "city-agencies.dob",
                  title: `DOB Q&A Session - ${text1}`,
                  date: formatDate(year, month, day),
                  time: time || "14:00",
                  location: "Virtual (Zoom)",
                  description: "Live Q&A session for job-specific filing questions, permits, codes, violations, and compliance matters.",
                  url: DOB_URL
                });
              }
            }
          }
        }
      });
    });

    // Also generate recurring Industry Meetings
    // Pattern: 2nd Wednesday (Bronx), 3rd Wednesday (Queens), 4th Wednesday (Manhattan),
    //          4th Thursday (Brooklyn), 4th Tuesday (Staten Island)
    const industryMeetings = [
      { borough: "Bronx", weekday: 3, nth: 2, location: "1775 Grand Concourse, 5th Floor, Bronx" },
      { borough: "Queens", weekday: 3, nth: 3, location: "120-55 Queens Boulevard, Room G110, Queens" },
      { borough: "Manhattan", weekday: 3, nth: 4, location: "280 Broadway, 3rd Floor, Manhattan" },
      { borough: "Brooklyn", weekday: 4, nth: 4, location: "345 Adams Street, Room #2, Brooklyn" },
      { borough: "Staten Island", weekday: 2, nth: 4, location: "10 Richmond Terrace, 2nd Floor, Staten Island" }
    ];

    // Generate for next 6 months
    for (let monthOffset = 0; monthOffset <= 6; monthOffset++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();

      for (const meeting of industryMeetings) {
        const meetingDate = getNthWeekday(year, month, meeting.weekday, meeting.nth);

        if (meetingDate >= now && meetingDate <= sixMonthsLater) {
          const dateStr = formatDate(year, month, meetingDate.getDate());
          meetings.push({
            id: `dob-industry-${meeting.borough.toLowerCase()}-${dateStr}`,
            org: "city-agencies.dob",
            title: `DOB Industry Meeting - ${meeting.borough}`,
            date: dateStr,
            time: "14:00",
            endTime: "15:30",
            location: meeting.location,
            description: "Monthly industry meeting with DOB borough office.",
            url: DOB_URL
          });
        }
      }
    }

  } catch (err) {
    console.error("Error scraping DOB:", err.message);
  }

  return meetings;
}

/**
 * Scrape DOE Panel for Educational Policy meetings
 */
async function scrapeDOEPEP() {
  const meetings = [];
  const now = new Date();
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  try {
    const html = await fetchHTML(DOE_PEP_URL);
    const $ = cheerio.load(html);

    // Look for meeting dates in tables or lists
    // Pattern: "July 23, 2025" or "January 28, 2026"
    const datePattern = /(\w+)\s+(\d{1,2}),?\s+(\d{4})/g;

    // Search through all text content
    const bodyText = $("body").text();
    let match;

    while ((match = datePattern.exec(bodyText)) !== null) {
      const monthName = match[1];
      const day = parseInt(match[2]);
      const year = parseInt(match[3]);
      const month = parseMonth(monthName);

      if (month === -1) continue;

      const meetingDate = new Date(year, month, day);
      if (meetingDate < now || meetingDate > sixMonthsLater) continue;

      // Check if this looks like a PEP meeting (context check)
      const dateStr = formatDate(year, month, day);

      // Avoid duplicates
      if (meetings.find(m => m.date === dateStr)) continue;

      // Try to find location near this date in the HTML
      let location = "";
      $("tr, li, p").each((_, elem) => {
        const text = $(elem).text();
        if (text.includes(match[0])) {
          // Look for school name patterns
          const schoolMatch = text.match(/([A-Z][A-Za-z\s.]+(?:School|Campus|High School|M\.S\.|P\.S\.).*?)(?:\(|,|\n|$)/);
          if (schoolMatch) {
            location = schoolMatch[1].trim();
          }
          // Also check for address in parentheses
          const addressMatch = text.match(/\(([^)]+(?:Street|Avenue|Parkway|Terrace|Road|Boulevard)[^)]*)\)/i);
          if (addressMatch) {
            location = location ? `${location} (${addressMatch[1]})` : addressMatch[1];
          }
        }
      });

      meetings.push({
        id: `doe-pep-${dateStr}`,
        org: "city-agencies.doe.pep",
        title: "Panel for Educational Policy Meeting",
        date: dateStr,
        time: "18:00",
        location: location || "See schools.nyc.gov for location",
        description: "Monthly meeting of the NYC Panel for Educational Policy. Remote access available via learndoe.org.",
        url: DOE_PEP_URL
      });
    }

  } catch (err) {
    console.error("Error scraping DOE PEP:", err.message);
  }

  return meetings;
}

/**
 * Main scraper function
 */
async function scrapeAgencies(apiKey) {
  const meetings = [];

  // Scrape DOB events
  const dobMeetings = await scrapeDOB();
  meetings.push(...dobMeetings);
  console.log(`DOB scraper found ${dobMeetings.length} meetings`);

  // Scrape DOE PEP meetings
  const pepMeetings = await scrapeDOEPEP();
  meetings.push(...pepMeetings);
  console.log(`DOE PEP scraper found ${pepMeetings.length} meetings`);

  console.log(`Agencies scraper found ${meetings.length} total meetings`);
  return meetings;
}

module.exports = { scrapeAgencies, scrapeDOB, scrapeDOEPEP };

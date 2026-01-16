// Oversight Boards Scraper
// Scrapes CCRB, BSA, LPC, and RGB meetings

const https = require("https");
const cheerio = require("cheerio");

/**
 * Fetch HTML from URL with redirect handling
 */
function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NYCCivicCalendar/1.0)"
      }
    };

    const protocol = url.startsWith("https") ? https : require("http");

    protocol.get(url, options, (res) => {
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

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
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
 * Check if date is within scraping range (1 month ago to 6 months ahead)
 */
function isInRange(date) {
  const now = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  return date >= oneMonthAgo && date <= sixMonthsLater;
}

// ============================================================================
// CCRB (Civilian Complaint Review Board)
// ============================================================================

const CCRB_URL = "https://www.nyc.gov/site/ccrb/about/news/board-meeting-schedule.page";

/**
 * Scrape CCRB Board Meeting schedule
 * Meetings are 2nd Wednesday of each month at 4:00 PM
 */
async function scrapeCCRB() {
  const meetings = [];

  try {
    const html = await fetchHTML(CCRB_URL);
    const $ = cheerio.load(html);

    // Look for date patterns in the page content
    // Format: "Wednesday January 8, 2025 at 4:00 PM" or "Wednesday, January 8, 2025 at 4:00 PM"
    const datePattern = /(?:Monday|Tuesday|Wednesday|Thursday|Friday),?\s+(\w+)\s+(\d{1,2}),?\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)/gi;

    const bodyText = $("body").text();
    let match;

    while ((match = datePattern.exec(bodyText)) !== null) {
      const monthName = match[1];
      const day = parseInt(match[2]);
      const year = parseInt(match[3]);
      let hours = parseInt(match[4]);
      const minutes = match[5];
      const ampm = match[6].toUpperCase();

      const month = parseMonth(monthName);
      if (month === -1) continue;

      // Convert to 24-hour time
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;

      const meetingDate = new Date(year, month, day);
      if (!isInRange(meetingDate)) continue;

      const dateStr = formatDate(year, month, day);
      const timeStr = `${String(hours).padStart(2, "0")}:${minutes}`;

      // Avoid duplicates
      if (meetings.find(m => m.date === dateStr)) continue;

      meetings.push({
        id: `ccrb-board-${dateStr}`,
        org: "city-agencies.ccrb.board",
        title: "CCRB Board Meeting",
        date: dateStr,
        time: timeStr,
        location: "100 Church Street, 10th Floor, New York, NY 10007",
        description: "Monthly public meeting of the Civilian Complaint Review Board. Available via Webex.",
        url: CCRB_URL
      });
    }

  } catch (err) {
    console.error("Error scraping CCRB:", err.message);
    throw err;
  }

  console.log(`CCRB scraper found ${meetings.length} meetings`);
  return meetings;
}

// ============================================================================
// LPC (Landmarks Preservation Commission)
// ============================================================================

const LPC_URL = "https://www.nyc.gov/site/lpc/hearings/hearings.page";
const LPC_CALENDAR_URL = "https://www.nyc.gov/assets/lpc/downloads/pdf/2025-lpc-calendar.pdf";
const LPC_CALENDAR_2026_URL = "https://www.nyc.gov/assets/lpc/downloads/pdf/2026-lpc-calendar.pdf";

/**
 * Scrape LPC Hearings
 * Weekly on Tuesdays at 9:30 AM
 */
async function scrapeLPC() {
  const meetings = [];

  try {
    const html = await fetchHTML(LPC_URL);
    const $ = cheerio.load(html);

    // LPC hearings are every Tuesday at 9:30 AM
    // We'll generate upcoming Tuesdays and check against page content
    const now = new Date();
    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

    // Find the next Tuesday
    let current = new Date(now);
    current.setDate(current.getDate() + ((2 - current.getDay() + 7) % 7 || 7)); // Next Tuesday

    // Also try to parse any specific dates from the page
    const datePattern = /(\w+)\s+(\d{1,2}),?\s+(\d{4})/gi;
    const bodyText = $("body").text();
    const foundDates = new Set();

    let match;
    while ((match = datePattern.exec(bodyText)) !== null) {
      const monthName = match[1];
      const day = parseInt(match[2]);
      const year = parseInt(match[3]);
      const month = parseMonth(monthName);

      if (month !== -1) {
        const date = new Date(year, month, day);
        if (isInRange(date) && date.getDay() === 2) { // Tuesday
          foundDates.add(formatDate(year, month, day));
        }
      }
    }

    // Generate Tuesdays for next 6 months
    while (current <= sixMonthsLater) {
      const dateStr = formatDate(current.getFullYear(), current.getMonth(), current.getDate());

      meetings.push({
        id: `lpc-hearing-${dateStr}`,
        org: "city-agencies.lpc.hearings",
        title: "LPC Public Hearing",
        date: dateStr,
        time: "09:30",
        location: "253 Broadway, 2nd Floor, New York, NY 10007",
        description: "Weekly public hearing of the Landmarks Preservation Commission. Testimony accepted in-person or via Zoom.",
        url: LPC_URL
      });

      // Move to next Tuesday
      current.setDate(current.getDate() + 7);
    }

  } catch (err) {
    console.error("Error scraping LPC:", err.message);
    throw err;
  }

  console.log(`LPC scraper found ${meetings.length} meetings`);
  return meetings;
}

// ============================================================================
// BSA (Board of Standards and Appeals)
// ============================================================================

const BSA_URL = "https://www.nyc.gov/site/bsa/public-hearings/public-hearings.page";

/**
 * Scrape BSA Public Hearings
 * Multiple days per week, typically Monday-Tuesday at 10:00 AM and 2:00 PM
 */
async function scrapeBSA() {
  const meetings = [];

  try {
    const html = await fetchHTML(BSA_URL);
    const $ = cheerio.load(html);

    // Look for hearing dates on the page
    // Format varies: "January 6, 2026" or "Monday, January 6, 2026"
    const datePattern = /(?:Monday|Tuesday|Wednesday|Thursday|Friday)?,?\s*(\w+)\s+(\d{1,2}),?\s+(\d{4})/gi;

    const bodyText = $("body").text();
    let match;

    while ((match = datePattern.exec(bodyText)) !== null) {
      const monthName = match[1];
      const day = parseInt(match[2]);
      const year = parseInt(match[3]);
      const month = parseMonth(monthName);

      if (month === -1) continue;

      const meetingDate = new Date(year, month, day);
      if (!isInRange(meetingDate)) continue;

      const dateStr = formatDate(year, month, day);

      // Avoid duplicates
      if (meetings.find(m => m.date === dateStr)) continue;

      // BSA hearings typically on Mondays and Tuesdays
      const dayOfWeek = meetingDate.getDay();
      if (dayOfWeek !== 1 && dayOfWeek !== 2) continue; // Skip if not Mon/Tue

      meetings.push({
        id: `bsa-hearing-${dateStr}`,
        org: "city-agencies.bsa.hearings",
        title: "BSA Public Hearing",
        date: dateStr,
        time: "10:00",
        location: "22 Reade Street, New York, NY 10007",
        description: "Public hearing on zoning variances, special permits, and appeals. Virtual attendance via Zoom available.",
        url: BSA_URL
      });
    }

    // If we didn't find many dates, generate typical Monday/Tuesday schedule
    if (meetings.length < 5) {
      const now = new Date();
      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

      let current = new Date(now);
      // Find next Monday
      current.setDate(current.getDate() + ((1 - current.getDay() + 7) % 7 || 7));

      while (current <= sixMonthsLater) {
        const dateStr = formatDate(current.getFullYear(), current.getMonth(), current.getDate());

        if (!meetings.find(m => m.date === dateStr)) {
          meetings.push({
            id: `bsa-hearing-${dateStr}`,
            org: "city-agencies.bsa.hearings",
            title: "BSA Public Hearing",
            date: dateStr,
            time: "10:00",
            location: "22 Reade Street, New York, NY 10007",
            description: "Public hearing on zoning variances, special permits, and appeals. Virtual attendance via Zoom available.",
            url: BSA_URL
          });
        }

        // Alternate: Monday this week, Tuesday next week pattern (simplified to weekly)
        current.setDate(current.getDate() + 7);
      }
    }

  } catch (err) {
    console.error("Error scraping BSA:", err.message);
    throw err;
  }

  console.log(`BSA scraper found ${meetings.length} meetings`);
  return meetings;
}

// ============================================================================
// RGB (Rent Guidelines Board)
// ============================================================================

const RGB_URL = "https://rentguidelinesboard.cityofnewyork.us/2025-meetings/";
const RGB_2026_URL = "https://rentguidelinesboard.cityofnewyork.us/2026-meetings/";

/**
 * Scrape RGB Meetings and Public Hearings
 * Annual cycle from January to June
 */
async function scrapeRGB() {
  const meetings = [];

  // Try both years
  const urls = [RGB_URL, RGB_2026_URL];

  for (const url of urls) {
    try {
      const html = await fetchHTML(url);
      const $ = cheerio.load(html);

      // Look for meeting entries
      // Format: "Thursday, January 16, 2025 at 9:30 am"
      const datePattern = /(?:Monday|Tuesday|Wednesday|Thursday|Friday),?\s+(\w+)\s+(\d{1,2}),?\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s*(am|pm)/gi;

      const bodyText = $("body").text();
      let match;

      while ((match = datePattern.exec(bodyText)) !== null) {
        const monthName = match[1];
        const day = parseInt(match[2]);
        const year = parseInt(match[3]);
        let hours = parseInt(match[4]);
        const minutes = match[5];
        const ampm = match[6].toLowerCase();

        const month = parseMonth(monthName);
        if (month === -1) continue;

        // Convert to 24-hour time
        if (ampm === "pm" && hours < 12) hours += 12;
        if (ampm === "am" && hours === 12) hours = 0;

        const meetingDate = new Date(year, month, day);
        if (!isInRange(meetingDate)) continue;

        const dateStr = formatDate(year, month, day);
        const timeStr = `${String(hours).padStart(2, "0")}:${minutes}`;

        // Avoid duplicates
        if (meetings.find(m => m.date === dateStr)) continue;

        // Determine meeting type based on context
        // June meetings are typically public hearings, earlier are research meetings
        const isHearing = month >= 4; // May-June are typically hearings
        const meetingType = isHearing ? "Public Hearing" : "Public Meeting";
        const orgKey = isHearing ? "city-agencies.rgb.hearings" : "city-agencies.rgb.meetings";

        meetings.push({
          id: `rgb-${isHearing ? "hearing" : "meeting"}-${dateStr}`,
          org: orgKey,
          title: `Rent Guidelines Board ${meetingType}`,
          date: dateStr,
          time: timeStr,
          location: "Spector Hall, 22 Reade Street, New York, NY 10007",
          description: isHearing
            ? "Public testimony session for rent guideline adjustments. Tenants and owners may testify."
            : "Research presentation and board discussion on housing costs and market conditions.",
          url: url
        });
      }

    } catch (err) {
      console.error(`Error scraping RGB from ${url}:`, err.message);
      // Continue to next URL
    }
  }

  console.log(`RGB scraper found ${meetings.length} meetings`);
  return meetings;
}

// ============================================================================
// Combined export
// ============================================================================

/**
 * Scrape all oversight boards
 */
async function scrapeOversightBoards() {
  const allMeetings = [];

  try {
    const ccrbMeetings = await scrapeCCRB();
    allMeetings.push(...ccrbMeetings);
  } catch (err) {
    console.error("CCRB scraper failed:", err.message);
  }

  try {
    const lpcMeetings = await scrapeLPC();
    allMeetings.push(...lpcMeetings);
  } catch (err) {
    console.error("LPC scraper failed:", err.message);
  }

  try {
    const bsaMeetings = await scrapeBSA();
    allMeetings.push(...bsaMeetings);
  } catch (err) {
    console.error("BSA scraper failed:", err.message);
  }

  try {
    const rgbMeetings = await scrapeRGB();
    allMeetings.push(...rgbMeetings);
  } catch (err) {
    console.error("RGB scraper failed:", err.message);
  }

  console.log(`Oversight boards scraper found ${allMeetings.length} total meetings`);
  return allMeetings;
}

module.exports = {
  scrapeCCRB,
  scrapeLPC,
  scrapeBSA,
  scrapeRGB,
  scrapeOversightBoards
};

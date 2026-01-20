// City Government Scrapers - Phase 2
// Covers: City Planning Commission, Comptroller, DCAS, Borough Presidents, DOB

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
// City Planning Commission (CPC)
// ============================================================================

const CPC_URL = "https://www.nyc.gov/content/planning/pages/commission";

/**
 * Scrape City Planning Commission meetings
 * Meets biweekly on Wednesdays at 10:00 AM
 * Reviews ULURP applications and land use changes
 */
async function scrapeCPC() {
  const meetings = [];

  // CPC meets biweekly on Wednesdays at 10:00 AM
  // Generate schedule for next 6 months
  const now = new Date();
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  // Find the next Wednesday
  let current = new Date(now);
  const daysUntilWednesday = (3 - current.getDay() + 7) % 7;
  current.setDate(current.getDate() + (daysUntilWednesday || 7));

  // CPC typically meets on the 1st and 3rd Wednesday, or every other Wednesday
  // We'll use a biweekly pattern starting from the known schedule
  // January 2026: Jan 7, Jan 22 (biweekly pattern)

  // Align to biweekly schedule - CPC met Jan 7, 2026
  const referenceDate = new Date(2026, 0, 7); // Jan 7, 2026
  const daysDiff = Math.floor((current - referenceDate) / (1000 * 60 * 60 * 24));
  const weeksDiff = Math.floor(daysDiff / 7);

  // If we're on an "off" week, move to next week
  if (weeksDiff % 2 !== 0) {
    current.setDate(current.getDate() + 7);
  }

  while (current <= sixMonthsLater) {
    const dateStr = formatDate(current.getFullYear(), current.getMonth(), current.getDate());

    meetings.push({
      id: `cpc-hearing-${dateStr}`,
      org: "city-agencies.dcp.commission",
      title: "City Planning Commission Public Meeting",
      date: dateStr,
      time: "10:00",
      location: "120 Broadway, Lower Level Conference Room, New York, NY 10271",
      description: "Biweekly public meeting reviewing ULURP applications, zoning changes, and land use matters. Available in-person and via Zoom livestream.",
      url: CPC_URL
    });

    // Move to next biweekly meeting (14 days)
    current.setDate(current.getDate() + 14);
  }

  console.log(`CPC scraper found ${meetings.length} meetings`);
  return meetings;
}

// ============================================================================
// Comptroller Investment Meetings
// ============================================================================

const COMPTROLLER_URL = "https://comptroller.nyc.gov/services/financial-matters/pension/investment-meetings/";

/**
 * Scrape Comptroller Investment Advisory Committee meetings
 * Includes: Common Investment Meeting, plus individual fund meetings
 */
async function scrapeComptroller() {
  const meetings = [];

  try {
    const html = await fetchHTML(COMPTROLLER_URL);
    const $ = cheerio.load(html);

    // Look for meeting dates in tables or text
    // Format: "Month DD, YYYY" or "MM/DD/YYYY"
    const datePattern1 = /(\w+)\s+(\d{1,2}),?\s+(\d{4})/gi;
    const datePattern2 = /(\d{1,2})\/(\d{1,2})\/(\d{4})/gi;

    const bodyText = $("body").text();

    // Try first pattern (Month DD, YYYY)
    let match;
    while ((match = datePattern1.exec(bodyText)) !== null) {
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

      meetings.push({
        id: `comptroller-investment-${dateStr}`,
        org: "city-agencies.comptroller.investment",
        title: "Investment Advisory Committee Meeting",
        date: dateStr,
        time: "09:30",
        location: "1 Centre Street, New York, NY 10007",
        description: "Investment Advisory Committee meeting reviewing pension fund investments and performance.",
        url: COMPTROLLER_URL
      });
    }

    // If we didn't find dates from scraping, generate typical schedule
    // Common Investment Meeting typically held 6x/year (every 2 months)
    if (meetings.length < 3) {
      const now = new Date();
      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

      // Generate bi-monthly meetings (every 2 months)
      let current = new Date(now.getFullYear(), now.getMonth(), 15);
      if (current < now) {
        current.setMonth(current.getMonth() + 1);
      }

      while (current <= sixMonthsLater) {
        const dateStr = formatDate(current.getFullYear(), current.getMonth(), 15);

        if (!meetings.find(m => m.date === dateStr)) {
          meetings.push({
            id: `comptroller-investment-${dateStr}`,
            org: "city-agencies.comptroller.investment",
            title: "Investment Advisory Committee Meeting",
            date: dateStr,
            time: "09:30",
            location: "1 Centre Street, New York, NY 10007",
            description: "Investment Advisory Committee meeting reviewing pension fund investments and performance.",
            url: COMPTROLLER_URL
          });
        }

        current.setMonth(current.getMonth() + 2);
      }
    }

  } catch (err) {
    console.error("Error scraping Comptroller:", err.message);
    throw err;
  }

  console.log(`Comptroller scraper found ${meetings.length} meetings`);
  return meetings;
}

// ============================================================================
// DCAS Civil Service Hearings
// ============================================================================

const DCAS_URL = "https://www.nyc.gov/site/dcas/about/public-hearings.page";

/**
 * Scrape DCAS Public Hearings
 * Monthly hearings on civil service matters
 */
async function scrapeDCAS() {
  const meetings = [];

  try {
    const html = await fetchHTML(DCAS_URL);
    const $ = cheerio.load(html);

    // Look for hearing dates
    const datePattern = /(\w+)\s+(\d{1,2}),?\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM|a\.m\.|p\.m\.)/gi;

    const bodyText = $("body").text();
    let match;

    while ((match = datePattern.exec(bodyText)) !== null) {
      const monthName = match[1];
      const day = parseInt(match[2]);
      const year = parseInt(match[3]);
      let hours = parseInt(match[4]);
      const minutes = match[5];
      const ampm = match[6].toLowerCase().replace(/\./g, "");

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

      meetings.push({
        id: `dcas-hearing-${dateStr}`,
        org: "city-agencies.dcas.hearings",
        title: "DCAS Public Hearing",
        date: dateStr,
        time: timeStr,
        location: "1 Centre Street, 20th Floor, New York, NY 10007",
        description: "Public hearing on civil service rules, examinations, and personnel matters.",
        url: DCAS_URL
      });
    }

    // Fallback: generate monthly schedule if we didn't find enough
    if (meetings.length < 3) {
      const now = new Date();
      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

      // DCAS hearings typically on 3rd Wednesday of each month
      let current = new Date(now.getFullYear(), now.getMonth(), 1);

      while (current <= sixMonthsLater) {
        // Find 3rd Wednesday
        let thirdWed = new Date(current.getFullYear(), current.getMonth(), 1);
        let wedCount = 0;
        while (wedCount < 3) {
          if (thirdWed.getDay() === 3) wedCount++;
          if (wedCount < 3) thirdWed.setDate(thirdWed.getDate() + 1);
        }

        if (thirdWed >= now && thirdWed <= sixMonthsLater) {
          const dateStr = formatDate(thirdWed.getFullYear(), thirdWed.getMonth(), thirdWed.getDate());

          if (!meetings.find(m => m.date === dateStr)) {
            meetings.push({
              id: `dcas-hearing-${dateStr}`,
              org: "city-agencies.dcas.hearings",
              title: "DCAS Public Hearing",
              date: dateStr,
              time: "10:00",
              location: "1 Centre Street, 20th Floor, New York, NY 10007",
              description: "Public hearing on civil service rules, examinations, and personnel matters.",
              url: DCAS_URL
            });
          }
        }

        current.setMonth(current.getMonth() + 1);
      }
    }

  } catch (err) {
    console.error("Error scraping DCAS:", err.message);
    throw err;
  }

  console.log(`DCAS scraper found ${meetings.length} meetings`);
  return meetings;
}

// ============================================================================
// Borough Presidents
// ============================================================================

const BROOKLYN_BP_URL = "https://www.brooklynbp.nyc.gov/events/";

/**
 * Scrape Brooklyn Borough President events
 * Template for other Borough Presidents
 */
async function scrapeBrooklynBP() {
  const meetings = [];

  try {
    const html = await fetchHTML(BROOKLYN_BP_URL);
    const $ = cheerio.load(html);

    // Look for events - Brooklyn BP uses "The Events Calendar" WordPress plugin
    // Check for JSON-LD structured data
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const jsonData = JSON.parse($(el).html());
        if (jsonData["@type"] === "Event" || (Array.isArray(jsonData) && jsonData[0]?.["@type"] === "Event")) {
          const events = Array.isArray(jsonData) ? jsonData : [jsonData];
          for (const event of events) {
            if (event["@type"] !== "Event") continue;

            const startDate = new Date(event.startDate);
            if (!isInRange(startDate)) continue;

            const dateStr = formatDate(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            const timeStr = `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`;

            meetings.push({
              id: `brooklyn-bp-${dateStr}-${meetings.length}`,
              org: "borough-presidents.brooklyn",
              title: event.name || "Brooklyn Borough President Event",
              date: dateStr,
              time: timeStr,
              location: event.location?.name || "Brooklyn Borough Hall, 209 Joralemon Street",
              description: event.description?.substring(0, 500) || "Brooklyn Borough President public event.",
              url: event.url || BROOKLYN_BP_URL
            });
          }
        }
      } catch (e) {
        // JSON parse error, skip
      }
    });

    // Fallback: look for date patterns in page content
    if (meetings.length === 0) {
      const datePattern = /(\w+)\s+(\d{1,2}),?\s+(\d{4})/gi;
      const bodyText = $(".tribe-events-calendar, .event-list, article, .content").text();

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

        meetings.push({
          id: `brooklyn-bp-${dateStr}`,
          org: "borough-presidents.brooklyn",
          title: "Brooklyn Borough President Event",
          date: dateStr,
          time: "10:00",
          location: "Brooklyn Borough Hall, 209 Joralemon Street, Brooklyn, NY 11201",
          description: "Brooklyn Borough President public event or hearing.",
          url: BROOKLYN_BP_URL
        });
      }
    }

  } catch (err) {
    console.error("Error scraping Brooklyn BP:", err.message);
    throw err;
  }

  console.log(`Brooklyn BP scraper found ${meetings.length} meetings`);
  return meetings;
}

// ============================================================================
// Department of Buildings (DOB)
// ============================================================================

const DOB_URL = "https://www.nyc.gov/site/buildings/dob/upcoming-events.page";

// Borough office addresses
const DOB_BOROUGH_OFFICES = {
  bronx: {
    name: "Bronx",
    address: "1932 Arthur Avenue, 5th Floor, Bronx, NY 10457"
  },
  brooklyn: {
    name: "Brooklyn",
    address: "210 Joralemon Street, 8th Floor, Brooklyn, NY 11201"
  },
  manhattan: {
    name: "Manhattan",
    address: "280 Broadway, 1st Floor, New York, NY 10007"
  },
  queens: {
    name: "Queens",
    address: "120-55 Queens Boulevard, 2nd Floor, Kew Gardens, NY 11424"
  },
  "staten-island": {
    name: "Staten Island",
    address: "60 Bay Street, 2nd Floor, Staten Island, NY 10301"
  }
};

/**
 * Get Nth occurrence of a weekday in a month
 * @param {number} year
 * @param {number} month - 0-indexed
 * @param {number} dayOfWeek - 0=Sunday, 1=Monday, ..., 6=Saturday
 * @param {number} n - 1=first, 2=second, 3=third, 4=fourth
 * @returns {Date|null}
 */
function getNthWeekday(year, month, dayOfWeek, n) {
  const firstOfMonth = new Date(year, month, 1);
  let firstOccurrence = 1 + ((dayOfWeek - firstOfMonth.getDay() + 7) % 7);
  const targetDay = firstOccurrence + (n - 1) * 7;

  // Check if it's a valid day in the month
  const result = new Date(year, month, targetDay);
  if (result.getMonth() !== month) return null;
  return result;
}

/**
 * Scrape DOB Buildings After Hours sessions
 * 1st and 3rd Tuesday of each month, 4:00-7:00 PM at all borough offices
 */
async function scrapeDOBAfterHours() {
  const meetings = [];
  const now = new Date();
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  // Generate schedule for 1st and 3rd Tuesdays
  let current = new Date(now.getFullYear(), now.getMonth(), 1);

  while (current <= sixMonthsLater) {
    const year = current.getFullYear();
    const month = current.getMonth();

    // Get 1st and 3rd Tuesdays (Tuesday = 2)
    const firstTuesday = getNthWeekday(year, month, 2, 1);
    const thirdTuesday = getNthWeekday(year, month, 2, 3);

    for (const tuesday of [firstTuesday, thirdTuesday]) {
      if (!tuesday || tuesday < now || tuesday > sixMonthsLater) continue;

      const dateStr = formatDate(tuesday.getFullYear(), tuesday.getMonth(), tuesday.getDate());

      meetings.push({
        id: `dob-after-hours-${dateStr}`,
        org: "city-agencies.dob.after-hours",
        title: "Buildings After Hours",
        date: dateStr,
        time: "16:00",
        endTime: "19:00",
        location: "All DOB Borough Offices",
        description: "Evening hours at all DOB borough offices. Staff assist with violations, property info, home renovations, and online resource navigation. Walk-in service available.",
        url: DOB_URL
      });
    }

    current.setMonth(current.getMonth() + 1);
  }

  console.log(`DOB After Hours scraper found ${meetings.length} sessions`);
  return meetings;
}

/**
 * Scrape DOB Industry Meetings
 * Monthly meetings at each borough office with specific schedules:
 * - Bronx: 2nd Wednesday, 2:00-3:30 PM
 * - Brooklyn: 4th Thursday, 2:00-3:30 PM
 * - Manhattan: 4th Wednesday, 2:00-3:30 PM
 * - Queens: 3rd Wednesday, 2:00-3:30 PM
 * - Staten Island: 4th Tuesday, 2:00-3:30 PM
 */
async function scrapeDOBIndustryMeetings() {
  const meetings = [];
  const now = new Date();
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  // Borough meeting schedules: [dayOfWeek (0=Sun), nthOccurrence, orgSuffix]
  const schedules = [
    { borough: "bronx", dayOfWeek: 3, nth: 2, org: "industry-bronx" },      // 2nd Wednesday
    { borough: "brooklyn", dayOfWeek: 4, nth: 4, org: "industry-brooklyn" }, // 4th Thursday
    { borough: "manhattan", dayOfWeek: 3, nth: 4, org: "industry-manhattan" }, // 4th Wednesday
    { borough: "queens", dayOfWeek: 3, nth: 3, org: "industry-queens" },     // 3rd Wednesday
    { borough: "staten-island", dayOfWeek: 2, nth: 4, org: "industry-si" }   // 4th Tuesday
  ];

  let current = new Date(now.getFullYear(), now.getMonth(), 1);

  while (current <= sixMonthsLater) {
    const year = current.getFullYear();
    const month = current.getMonth();

    for (const schedule of schedules) {
      const meetingDate = getNthWeekday(year, month, schedule.dayOfWeek, schedule.nth);
      if (!meetingDate || meetingDate < now || meetingDate > sixMonthsLater) continue;

      const dateStr = formatDate(meetingDate.getFullYear(), meetingDate.getMonth(), meetingDate.getDate());
      const office = DOB_BOROUGH_OFFICES[schedule.borough];

      meetings.push({
        id: `dob-industry-${schedule.borough}-${dateStr}`,
        org: `city-agencies.dob.${schedule.org}`,
        title: `DOB Industry Meeting - ${office.name}`,
        date: dateStr,
        time: "14:00",
        endTime: "15:30",
        location: office.address,
        description: `Monthly in-person industry meeting for Registered Design Professionals (RDPs) and Class 2 Filing Representatives at the ${office.name} borough office.`,
        url: DOB_URL
      });
    }

    current.setMonth(current.getMonth() + 1);
  }

  console.log(`DOB Industry Meetings scraper found ${meetings.length} meetings`);
  return meetings;
}

// ============================================================================
// Combined export
// ============================================================================

/**
 * Scrape all Phase 2 city government sources
 */
async function scrapeCityGovernment() {
  const allMeetings = [];

  try {
    const cpcMeetings = await scrapeCPC();
    allMeetings.push(...cpcMeetings);
  } catch (err) {
    console.error("CPC scraper failed:", err.message);
  }

  try {
    const comptrollerMeetings = await scrapeComptroller();
    allMeetings.push(...comptrollerMeetings);
  } catch (err) {
    console.error("Comptroller scraper failed:", err.message);
  }

  try {
    const dcasMeetings = await scrapeDCAS();
    allMeetings.push(...dcasMeetings);
  } catch (err) {
    console.error("DCAS scraper failed:", err.message);
  }

  try {
    const brooklynBPMeetings = await scrapeBrooklynBP();
    allMeetings.push(...brooklynBPMeetings);
  } catch (err) {
    console.error("Brooklyn BP scraper failed:", err.message);
  }

  try {
    const dobAfterHoursMeetings = await scrapeDOBAfterHours();
    allMeetings.push(...dobAfterHoursMeetings);
  } catch (err) {
    console.error("DOB After Hours scraper failed:", err.message);
  }

  try {
    const dobIndustryMeetings = await scrapeDOBIndustryMeetings();
    allMeetings.push(...dobIndustryMeetings);
  } catch (err) {
    console.error("DOB Industry Meetings scraper failed:", err.message);
  }

  console.log(`City government scraper found ${allMeetings.length} total meetings`);
  return allMeetings;
}

module.exports = {
  scrapeCPC,
  scrapeComptroller,
  scrapeDCAS,
  scrapeBrooklynBP,
  scrapeDOBAfterHours,
  scrapeDOBIndustryMeetings,
  scrapeCityGovernment
};

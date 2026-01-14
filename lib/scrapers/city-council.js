// City Council Scraper
// Scrapes meeting data from legistar.council.nyc.gov

const https = require("https");
const cheerio = require("cheerio");

const CALENDAR_URL = "https://legistar.council.nyc.gov/Calendar.aspx";

// Map committee names to our org keys
const bodyNameToOrgKey = {
  "city council stated meeting": "city-council.stated",
  "stated meeting": "city-council.stated",
  "committee on aging": "city-council.aging",
  "committee on children and youth": "city-council.children-youth",
  "committee on civil and human rights": "city-council.civil-human-rights",
  "committee on civil service and labor": "city-council.civil-service-labor",
  "committee on consumer and worker protection": "city-council.consumer-worker-protection",
  "committee on contracts": "city-council.contracts",
  "committee on criminal justice": "city-council.criminal-justice",
  "committee on cultural affairs, libraries and international intergroup relations": "city-council.cultural-affairs",
  "committee on economic development": "city-council.economic-development",
  "committee on education": "city-council.education",
  "committee on environmental protection, resiliency and waterfronts": "city-council.environmental-protection",
  "committee on finance": "city-council.finance",
  "committee on fire and emergency management": "city-council.fire-emergency",
  "committee on general welfare": "city-council.general-welfare",
  "committee on governmental operations, state & federal legislation": "city-council.governmental-operations",
  "committee on health": "city-council.health",
  "committee on higher education": "city-council.higher-education",
  "committee on hospitals": "city-council.hospitals",
  "committee on housing and buildings": "city-council.housing-buildings",
  "committee on immigration": "city-council.immigration",
  "committee on land use": "city-council.land-use",
  "committee on mental health, disabilities and addiction": "city-council.mental-health",
  "committee on oversight and investigations": "city-council.oversight-investigations",
  "committee on parks and recreation": "city-council.parks-recreation",
  "committee on public housing": "city-council.public-housing",
  "committee on public safety": "city-council.public-safety",
  "committee on rules, privileges and elections": "city-council.rules-privileges",
  "committee on sanitation and solid waste management": "city-council.sanitation",
  "committee on small business": "city-council.small-business",
  "committee on standards and ethics": "city-council.standards-ethics",
  "committee on technology": "city-council.technology",
  "committee on transportation and infrastructure": "city-council.transportation",
  "committee on veterans": "city-council.veterans",
  "committee on women and gender equity": "city-council.women-gender",
  "subcommittee on senior centers and food insecurity": "city-council.subcommittee-seniors-food",
  "subcommittee on landmarks, public sitings and dispositions": "city-council.subcommittee-landmarks",
  "subcommittee on zoning and franchises": "city-council.subcommittee-zoning",
};

/**
 * Fetch page HTML
 */
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    };
    https.get(url, options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

/**
 * Get org key from committee name
 */
function getOrgKey(name) {
  const lower = name.toLowerCase().trim();

  // Try exact match
  if (bodyNameToOrgKey[lower]) {
    return bodyNameToOrgKey[lower];
  }

  // Try partial match
  for (const [key, value] of Object.entries(bodyNameToOrgKey)) {
    if (lower.includes(key) || key.includes(lower)) {
      return value;
    }
  }

  // If it's a committee or subcommittee we don't recognize, log it
  if (lower.includes("committee") || lower.includes("subcommittee")) {
    console.log(`Unknown City Council body: ${name}`);
  }

  return null;
}

/**
 * Parse date from M/D/YYYY format
 */
function parseDate(dateStr) {
  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;

  const month = parseInt(match[1]) - 1;
  const day = parseInt(match[2]);
  const year = parseInt(match[3]);

  return new Date(year, month, day);
}

/**
 * Parse time from "H:MM AM/PM" format
 */
function parseTime(timeStr) {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;

  let hours = parseInt(match[1]);
  const minutes = match[2];
  const ampm = match[3].toUpperCase();

  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

/**
 * Scrape City Council meetings
 */
async function scrapeCityCouncil() {
  const meetings = [];

  try {
    const html = await fetchPage(CALENDAR_URL);
    const $ = cheerio.load(html);

    const now = new Date();
    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Find meeting rows in the grid
    // The table has columns: Name, Date, (empty), Time, Location, Topic, Details, Agenda, Minutes, Multimedia
    $("tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 5) return;

      // Get cell text (note: column 2 is empty, so time is at index 3)
      const name = $(cells[0]).text().trim();
      const dateStr = $(cells[1]).text().trim();
      const timeStr = $(cells[3]).text().trim();  // Skip empty column at index 2
      const location = $(cells[4]).text().trim();

      // Check if this is a valid meeting row
      if (!dateStr.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) return;

      const meetingDate = parseDate(dateStr);
      if (!meetingDate) return;

      // Filter by date range
      if (meetingDate < oneMonthAgo || meetingDate > sixMonthsLater) return;

      // Get org key
      const orgKey = getOrgKey(name);
      if (!orgKey) return;

      // Parse time
      const time = parseTime(timeStr);

      // Format date as YYYY-MM-DD
      const year = meetingDate.getFullYear();
      const month = String(meetingDate.getMonth() + 1).padStart(2, "0");
      const day = String(meetingDate.getDate()).padStart(2, "0");
      const dateFormatted = `${year}-${month}-${day}`;

      // Get meeting link if available
      const link = $(cells[0]).find("a").attr("href") || "";
      const fullUrl = link.startsWith("http")
        ? link
        : link ? `https://legistar.council.nyc.gov/${link}` : CALENDAR_URL;

      meetings.push({
        id: `cc-${orgKey}-${dateFormatted}`.replace(/\./g, "-"),
        org: orgKey,
        title: name,
        date: dateFormatted,
        time: time,
        location: location || "City Hall, New York, NY",
        description: "",
        url: fullUrl
      });
    });

  } catch (err) {
    console.error("Error scraping City Council:", err.message);
    throw err;
  }

  console.log(`City Council scraper found ${meetings.length} meetings`);
  return meetings;
}

module.exports = { scrapeCityCouncil, getOrgKey };

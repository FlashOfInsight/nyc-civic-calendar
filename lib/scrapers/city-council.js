// City Council Scraper
// Fetches meeting data from the Legistar OData API for NYC Council

const https = require("https");

const LEGISTAR_TOKEN = process.env.LEGISTAR_TOKEN;
const API_BASE = "https://webapi.legistar.com/v1/nyc";

// Map Legistar BodyId to our org keys
// IDs sourced from /v1/nyc/bodies?$filter=BodyActiveFlag eq 1
const bodyIdToOrgKey = {
  1: "city-council.stated",            // City Council (Stated Meetings)
  3: "city-council.aging",             // Committee on Aging
  4: "city-council.civil-service-labor",
  6: "city-council.contracts",
  7: "city-council.economic-development",
  9: "city-council.education",
  11: "city-council.finance",
  12: "city-council.general-welfare",
  14: "city-council.health",
  15: "city-council.higher-education",
  16: "city-council.housing-buildings",
  17: "city-council.land-use",
  19: "city-council.public-safety",
  34: "city-council.subcommittee-zoning",
  5104: "city-council.subcommittee-seniors-food",
  5106: "city-council.parks-recreation",
  5107: "city-council.oversight-investigations",
  5108: "city-council.sanitation",
  5119: "city-council.immigration",
  5120: "city-council.small-business",
  5122: "city-council.veterans",
  5127: "city-council.rules-privileges",
  5212: "city-council.public-housing",
  5213: "city-council.technology",
  5235: "city-council.civil-human-rights",
  5237: "city-council.criminal-justice",
  5239: "city-council.fire-emergency",
  5241: "city-council.hospitals",
  5244: "city-council.women-gender",
  5268: "city-council.transportation",
  5269: "city-council.consumer-worker-protection",
  5293: "city-council.governmental-operations",
  5294: "city-council.children-youth",
  5308: "city-council.environmental-protection",
  5309: "city-council.subcommittee-landmarks",
  5311: "city-council.combat-hate",
  5312: "city-council.disabilities",
  5313: "city-council.subcommittee-early-childhood",
  5314: "city-council.workforce-development",
  5315: "city-council.mental-health",
  5316: "city-council.cultural-affairs",
};

// Map org keys to short display names for "CC ..." calendar titles
const orgKeyToShortName = {
  "city-council.stated": "Stated Meeting",
  "city-council.aging": "Aging",
  "city-council.children-youth": "Children and Youth",
  "city-council.civil-human-rights": "Civil and Human Rights",
  "city-council.civil-service-labor": "Civil Service and Labor",
  "city-council.combat-hate": "Combat Hate",
  "city-council.consumer-worker-protection": "Consumer and Worker Protection",
  "city-council.contracts": "Contracts",
  "city-council.criminal-justice": "Criminal Justice",
  "city-council.cultural-affairs": "Cultural Affairs, Libraries and International Relations",
  "city-council.disabilities": "Disabilities",
  "city-council.economic-development": "Economic Development",
  "city-council.education": "Education",
  "city-council.environmental-protection": "Environmental Protection and Waterfronts",
  "city-council.finance": "Finance",
  "city-council.fire-emergency": "Fire and Emergency Management",
  "city-council.general-welfare": "General Welfare",
  "city-council.governmental-operations": "Governmental Operations",
  "city-council.health": "Health",
  "city-council.higher-education": "Higher Education",
  "city-council.hospitals": "Hospitals",
  "city-council.housing-buildings": "Housing and Buildings",
  "city-council.immigration": "Immigration",
  "city-council.land-use": "Land Use",
  "city-council.mental-health": "Mental Health and Substance Use",
  "city-council.oversight-investigations": "Oversight and Investigations",
  "city-council.parks-recreation": "Parks and Recreation",
  "city-council.public-housing": "Public Housing",
  "city-council.public-safety": "Public Safety",
  "city-council.rules-privileges": "Rules, Privileges, Elections, Standards and Ethics",
  "city-council.sanitation": "Sanitation and Solid Waste Management",
  "city-council.small-business": "Small Business",
  "city-council.technology": "Technology",
  "city-council.transportation": "Transportation and Infrastructure",
  "city-council.veterans": "Veterans",
  "city-council.women-gender": "Women and Gender Equity",
  "city-council.workforce-development": "Workforce Development",
  "city-council.subcommittee-seniors-food": "Senior Centers and Food Security",
  "city-council.subcommittee-early-childhood": "Early Childhood Education",
  "city-council.subcommittee-landmarks": "Landmarks, Public Sitings, Resiliency and Dispositions",
  "city-council.subcommittee-zoning": "Zoning and Franchises",
};

/**
 * Fetch JSON from the Legistar API
 */
function fetchAPI(path) {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${API_BASE}${path}${separator}Token=${LEGISTAR_TOKEN}`;

  return new Promise((resolve, reject) => {
    https.get(url, { headers: { Accept: "application/json" } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Legistar API returned ${res.statusCode} for ${path}`));
        res.resume();
        return;
      }
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse Legistar API response for ${path}`));
        }
      });
    }).on("error", reject);
  });
}

/**
 * Parse time from "H:MM AM/PM" format to "HH:MM" 24-hour
 */
function parseTime(timeStr) {
  if (!timeStr) return null;
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
 * Build "CC ..." calendar title from org key
 */
function buildTitle(orgKey) {
  const shortName = orgKeyToShortName[orgKey];
  if (shortName) return `CC ${shortName}`;
  // Fallback: strip prefix and title-case
  const suffix = orgKey.replace("city-council.", "").replace(/-/g, " ");
  return `CC ${suffix.charAt(0).toUpperCase() + suffix.slice(1)}`;
}

/**
 * Scrape City Council meetings from Legistar API
 */
async function scrapeCityCouncil() {
  if (!LEGISTAR_TOKEN) {
    throw new Error("LEGISTAR_TOKEN environment variable is not set");
  }

  const meetings = [];

  const now = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  // Format dates for OData filter
  const fromDate = oneMonthAgo.toISOString().split("T")[0];
  const toDate = sixMonthsLater.toISOString().split("T")[0];

  // Fetch all events in our date range, ordered by date descending
  // $top=500 ensures we get everything (typically ~150-200 in a 7-month window)
  const filter = `EventDate ge datetime'${fromDate}' and EventDate le datetime'${toDate}'`;
  const events = await fetchAPI(
    `/events?$filter=${encodeURIComponent(filter)}&$orderby=EventDate desc&$top=500`
  );

  if (!Array.isArray(events)) {
    throw new Error("Legistar API returned unexpected format");
  }

  for (const event of events) {
    const orgKey = bodyIdToOrgKey[event.EventBodyId];
    if (!orgKey) continue; // Skip bodies we don't track (delegations, conferences, etc.)

    // Parse date
    const eventDate = new Date(event.EventDate);
    const year = eventDate.getFullYear();
    const month = String(eventDate.getMonth() + 1).padStart(2, "0");
    const day = String(eventDate.getDate()).padStart(2, "0");
    const dateFormatted = `${year}-${month}-${day}`;

    // Parse time
    const time = parseTime(event.EventTime);

    // Build standardized title
    const title = buildTitle(orgKey);

    // Meeting detail URL
    const url = event.EventInSiteURL || "https://legistar.council.nyc.gov/Calendar.aspx";

    meetings.push({
      id: `cc-${orgKey.replace(/\./g, "-")}-${dateFormatted}`,
      org: orgKey,
      title: title,
      date: dateFormatted,
      time: time,
      location: event.EventLocation || "City Hall, New York, NY",
      description: event.EventComment || "",
      url: url,
      agendaUrl: event.EventAgendaFile || null,
    });
  }

  console.log(`City Council scraper found ${meetings.length} meetings (via Legistar API)`);
  return meetings;
}

module.exports = { scrapeCityCouncil, bodyIdToOrgKey, orgKeyToShortName, buildTitle };

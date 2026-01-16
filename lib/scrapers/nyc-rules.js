// NYC Rules Scraper
// Scrapes public hearings from rules.cityofnewyork.us/calendar/
// This covers rulemaking hearings for multiple agencies including:
// DOT, DSNY, DCAS, DCWP, DEP, HPD, and many others

const https = require("https");

const NYC_RULES_URL = "https://rules.cityofnewyork.us/calendar/";

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
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith("/")) {
          redirectUrl = "https://rules.cityofnewyork.us" + redirectUrl;
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
 * Map agency names to our org keys
 * Keys are uppercase for case-insensitive matching
 */
const agencyToOrgKey = {
  // Transportation
  "DOT": "city-agencies.dot.rules",
  "DEPARTMENT OF TRANSPORTATION": "city-agencies.dot.rules",
  // Sanitation
  "DSNY": "city-agencies.dsny.rules",
  "DEPARTMENT OF SANITATION": "city-agencies.dsny.rules",
  // Administrative Services
  "DCAS": "city-agencies.dcas.rules",
  "DEPARTMENT OF CITYWIDE ADMINISTRATIVE SERVICES": "city-agencies.dcas.rules",
  // Consumer Protection
  "DCWP": "city-agencies.dcwp.rules",
  "DCA": "city-agencies.dcwp.rules",
  "DEPARTMENT OF CONSUMER AND WORKER PROTECTION": "city-agencies.dcwp.rules",
  // Environmental Protection
  "DEP": "city-agencies.dep.rules",
  "DEPARTMENT OF ENVIRONMENTAL PROTECTION": "city-agencies.dep.rules",
  // Housing
  "HPD": "city-agencies.hpd.rules",
  "HOUSING PRESERVATION AND DEVELOPMENT": "city-agencies.hpd.rules",
  // Buildings
  "DOB": "city-agencies.dob.rules",
  "DEPARTMENT OF BUILDINGS": "city-agencies.dob.rules",
  // Health
  "DOHMH": "city-agencies.dohmh.rules",
  "DEPARTMENT OF HEALTH AND MENTAL HYGIENE": "city-agencies.dohmh.rules",
  // Fire
  "FDNY": "city-agencies.fdny.rules",
  "FIRE DEPARTMENT": "city-agencies.fdny.rules",
  // Parks
  "DPR": "city-agencies.parks.rules",
  "DEPARTMENT OF PARKS AND RECREATION": "city-agencies.parks.rules",
  // Education
  "DOE": "city-agencies.doe.rules",
  "DEPARTMENT OF EDUCATION": "city-agencies.doe.rules",
  // Police
  "NYPD": "city-agencies.nypd.rules",
  "POLICE DEPARTMENT": "city-agencies.nypd.rules",
  // TLC
  "TLC": "city-agencies.tlc.rules",
  "TAXI AND LIMOUSINE COMMISSION": "city-agencies.tlc.rules",
  // Small Business
  "SBS": "city-agencies.sbs.rules",
  "DEPARTMENT OF SMALL BUSINESS SERVICES": "city-agencies.sbs.rules",
  // Aging
  "DFTA": "city-agencies.dfta.rules",
  "DEPARTMENT FOR THE AGING": "city-agencies.dfta.rules",
  // Children's Services
  "ACS": "city-agencies.acs.rules",
  "ADMINISTRATION FOR CHILDREN'S SERVICES": "city-agencies.acs.rules",
  // Social Services
  "DSS": "city-agencies.dss.rules",
  "DEPARTMENT OF SOCIAL SERVICES": "city-agencies.dss.rules",
  "HRA": "city-agencies.dss.rules",
  "HUMAN RESOURCES ADMINISTRATION": "city-agencies.dss.rules",
  // Finance
  "DOF": "city-agencies.other.rules",
  "DEPARTMENT OF FINANCE": "city-agencies.other.rules",
  // Oversight boards (map to existing orgs)
  "BOARD OF STANDARDS AND APPEALS": "city-agencies.bsa.hearings",
  "RENT GUIDELINES BOARD": "city-agencies.rgb.hearings",
  "LANDMARKS PRESERVATION COMMISSION": "city-agencies.lpc.hearings",
  "CIVILIAN COMPLAINT REVIEW BOARD": "city-agencies.ccrb.board",
  // Other common agencies
  "BOARD OF CORRECTION": "city-agencies.other.rules",
  "OFFICE OF ADMINISTRATIVE TRIALS AND HEARINGS": "city-agencies.other.rules",
  "OATH": "city-agencies.other.rules",
  "PROCUREMENT POLICY BOARD": "city-agencies.other.rules",
  "FRANCHISE AND CONCESSION REVIEW COMMITTEE": "city-agencies.other.rules",
  "CONFLICT OF INTEREST BOARD": "city-agencies.other.rules",
  "CAMPAIGN FINANCE BOARD": "city-agencies.other.rules",
  "CIVIC ENGAGEMENT COMMISSION": "city-agencies.other.rules",
  "CITY COMMISSION ON HUMAN RIGHTS": "city-agencies.other.rules",
  "BUSINESS INTEGRITY COMMISSION": "city-agencies.other.rules",
  "LOFT BOARD": "city-agencies.other.rules",
  "MAYOR'S OFFICE": "city-agencies.other.rules",
  "COMPTROLLER": "city-agencies.other.rules",
  "NYC EMERGENCY MANAGEMENT": "city-agencies.other.rules",
  "STREET ACTIVITY PERMIT OFFICE": "city-agencies.other.rules",
  "STREET ACTIVITY PERMITS OFFICE": "city-agencies.other.rules",
};

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Check if date is within scraping range
 */
function isInRange(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  return date >= oneMonthAgo && date <= sixMonthsLater;
}

/**
 * Extract hearing_array from page source
 * The page contains: var hearing_array = [...];
 */
function extractHearingArray(html) {
  // Look for the hearing_array variable
  const match = html.match(/var\s+hearing_array\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) {
    console.warn("Could not find hearing_array in page");
    return [];
  }

  try {
    // Parse the JSON array
    const arrayStr = match[1];
    return JSON.parse(arrayStr);
  } catch (err) {
    console.error("Error parsing hearing_array:", err.message);
    return [];
  }
}

/**
 * Scrape NYC Rules calendar for all agency hearings
 */
async function scrapeNYCRules() {
  const meetings = [];

  try {
    const html = await fetchHTML(NYC_RULES_URL);

    // Extract the hearing_array from the page
    const hearings = extractHearingArray(html);

    for (const hearing of hearings) {
      // Each hearing has: rule_title, agency_name, rule_url, hearing dates (up to 10)
      // Dates are in format: ["2025-07-16","10:00:00","11:00:00"]

      const agencyName = hearing.agency_name || "";
      const ruleTitle = hearing.rule_title || "Public Hearing";
      const ruleUrl = hearing.rule_url || NYC_RULES_URL;

      // Find org key for this agency (case-insensitive)
      const agencyUpper = agencyName.toUpperCase();
      let orgKey = agencyToOrgKey[agencyUpper];

      if (!orgKey) {
        // Try partial match
        for (const [key, value] of Object.entries(agencyToOrgKey)) {
          if (agencyUpper.includes(key) || key.includes(agencyUpper)) {
            orgKey = value;
            break;
          }
        }
      }

      if (!orgKey) {
        // Unknown agency - use generic key
        orgKey = "city-agencies.other.rules";
        console.log(`Unknown agency in NYC Rules: ${agencyName}`);
      }

      // Process each hearing date (up to 10 per rule)
      // Format is rule_hearing_array_N: ["2026-02-18","10:00:00","11:00:00"]
      for (let i = 1; i <= 10; i++) {
        const arrayKey = `rule_hearing_array_${i}`;
        const hearingArray = hearing[arrayKey];

        // Skip if empty or missing
        if (!hearingArray || !Array.isArray(hearingArray) || hearingArray.length < 1) continue;

        const dateStr = hearingArray[0];
        const startTime = hearingArray[1] || "";
        const endTime = hearingArray[2] || "";

        if (!dateStr || dateStr === "") continue;

        // Check if in range
        if (!isInRange(dateStr)) continue;

        // Parse time (format: "10:00:00")
        let time = "10:00";
        if (startTime && startTime.length >= 5) {
          time = startTime.substring(0, 5);
        }

        // Create unique ID
        const idSlug = ruleTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .substring(0, 30);
        const id = `nyc-rules-${idSlug}-${dateStr}`.replace(/--+/g, "-");

        // Avoid duplicates
        if (meetings.find(m => m.id === id)) continue;

        meetings.push({
          id: id,
          org: orgKey,
          title: `${agencyName}: ${ruleTitle}`.substring(0, 100),
          date: dateStr,
          time: time,
          endTime: endTime && endTime.length >= 5 ? endTime.substring(0, 5) : null,
          location: "Virtual (Microsoft Teams or Zoom)",
          description: `Public hearing on proposed rule: ${ruleTitle}. Comments can be submitted online at rules.cityofnewyork.us`,
          url: ruleUrl.startsWith("http") ? ruleUrl : `https://rules.cityofnewyork.us${ruleUrl}`
        });
      }
    }

  } catch (err) {
    console.error("Error scraping NYC Rules:", err.message);
    throw err;
  }

  console.log(`NYC Rules scraper found ${meetings.length} meetings`);
  return meetings;
}

module.exports = { scrapeNYCRules };

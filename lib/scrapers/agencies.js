// NYC Agencies Scraper
// Uses the NYC Events Calendar API for DOT, DOB, DOE events

const https = require("https");

// NYC Events Calendar API base
const API_BASE = "https://api.nyc.gov/calendar";

// Agency name mappings
const agencyToOrgKey = {
  "DOT": "city-agencies.dot",
  "Department of Transportation": "city-agencies.dot",
  "DOB": "city-agencies.dob",
  "Department of Buildings": "city-agencies.dob",
  "Buildings": "city-agencies.dob",
  "DOE": "city-agencies.doe.all",
  "Department of Education": "city-agencies.doe.all",
  "Education": "city-agencies.doe.all",
  "Panel for Educational Policy": "city-agencies.doe.pep",
  "PEP": "city-agencies.doe.pep"
};

/**
 * Fetch from NYC API
 * @param {string} endpoint
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
function fetchAPI(endpoint, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${endpoint}`;
    const options = {
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey
      }
    };

    https.get(url, options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    }).on("error", reject);
  });
}

/**
 * Get org key from agency/event info
 * @param {Object} event
 * @returns {string|null}
 */
function getOrgKey(event) {
  const agency = event.agency || event.AgencyName || "";
  const title = event.name || event.title || "";

  // Check for PEP specifically
  if (title.toLowerCase().includes("panel for educational policy") ||
      title.toLowerCase().includes("pep meeting")) {
    return "city-agencies.doe.pep";
  }

  // Check agency mappings
  for (const [keyword, orgKey] of Object.entries(agencyToOrgKey)) {
    if (agency.includes(keyword) || title.includes(keyword)) {
      return orgKey;
    }
  }

  return null;
}

/**
 * Scrape NYC agency events
 * @param {string} apiKey - NYC API subscription key
 * @returns {Promise<Array>}
 */
async function scrapeAgencies(apiKey) {
  const meetings = [];

  if (!apiKey) {
    console.warn("No NYC API key provided, skipping agency scrape");
    return meetings;
  }

  try {
    // Get events for the next 6 months
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 6);

    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];

    // Search for events - the exact endpoint structure may vary
    // This is a general pattern; adjust based on actual API documentation
    const endpoint = `/search?startDate=${startStr}&endDate=${endStr}`;

    const response = await fetchAPI(endpoint, apiKey);
    const events = response.events || response.items || response || [];

    if (!Array.isArray(events)) {
      console.log("No events array in response");
      return meetings;
    }

    for (const event of events) {
      const orgKey = getOrgKey(event);
      if (!orgKey) continue;

      // Parse date
      const eventDate = event.startDate || event.date;
      if (!eventDate) continue;

      const dateObj = new Date(eventDate);
      const dateStr = dateObj.toISOString().split("T")[0];

      // Parse time
      let timeStr = null;
      if (event.startTime) {
        timeStr = event.startTime;
      } else if (event.startDate && event.startDate.includes("T")) {
        timeStr = event.startDate.split("T")[1].substring(0, 5);
      }

      meetings.push({
        id: `agency-${event.id || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        org: orgKey,
        title: event.name || event.title,
        date: dateStr,
        time: timeStr,
        location: event.location || event.address || "",
        description: event.description || "",
        url: event.url || event.link || ""
      });
    }

  } catch (err) {
    console.error("Error fetching agency events:", err.message);
  }

  return meetings;
}

/**
 * Alternative: Scrape individual agency pages if API is unavailable
 * This is a fallback that can be expanded
 */
async function scrapeAgencyPages() {
  // TODO: Implement fallback scraping for individual agency pages
  // - DOB: https://www.nyc.gov/site/buildings/dob/upcoming-events.page
  // - DOT: Various pages
  // - DOE PEP: https://www.schools.nyc.gov/about-us/leadership/panel-for-education-policy
  return [];
}

module.exports = { scrapeAgencies, scrapeAgencyPages };

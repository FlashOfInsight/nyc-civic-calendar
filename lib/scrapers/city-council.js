// City Council Scraper
// Uses the Legistar API to fetch City Council meetings

const https = require("https");

// Legistar API base URL for NYC
const API_BASE = "https://webapi.legistar.com/v1/nyc";

// Map Legistar body names to our org keys
const bodyNameToOrgKey = {
  "City Council": "city-council.stated",
  "Stated Meeting": "city-council.stated",
  "Committee on Aging": "city-council.aging",
  "Committee on Children and Youth": "city-council.children-youth",
  "Committee on Civil and Human Rights": "city-council.civil-human-rights",
  "Committee on Civil Service and Labor": "city-council.civil-service-labor",
  "Committee on Consumer and Worker Protection": "city-council.consumer-worker-protection",
  "Committee on Contracts": "city-council.contracts",
  "Committee on Criminal Justice": "city-council.criminal-justice",
  "Committee on Cultural Affairs, Libraries and International Intergroup Relations": "city-council.cultural-affairs",
  "Committee on Economic Development": "city-council.economic-development",
  "Committee on Education": "city-council.education",
  "Committee on Environmental Protection, Resiliency and Waterfronts": "city-council.environmental-protection",
  "Committee on Finance": "city-council.finance",
  "Committee on Fire and Emergency Management": "city-council.fire-emergency",
  "Committee on General Welfare": "city-council.general-welfare",
  "Committee on Governmental Operations, State & Federal Legislation": "city-council.governmental-operations",
  "Committee on Health": "city-council.health",
  "Committee on Higher Education": "city-council.higher-education",
  "Committee on Hospitals": "city-council.hospitals",
  "Committee on Housing and Buildings": "city-council.housing-buildings",
  "Committee on Immigration": "city-council.immigration",
  "Committee on Land Use": "city-council.land-use",
  "Committee on Mental Health, Disabilities and Addiction": "city-council.mental-health",
  "Committee on Oversight and Investigations": "city-council.oversight-investigations",
  "Committee on Parks and Recreation": "city-council.parks-recreation",
  "Committee on Public Housing": "city-council.public-housing",
  "Committee on Public Safety": "city-council.public-safety",
  "Committee on Rules, Privileges and Elections": "city-council.rules-privileges",
  "Committee on Sanitation and Solid Waste Management": "city-council.sanitation",
  "Committee on Small Business": "city-council.small-business",
  "Committee on Standards and Ethics": "city-council.standards-ethics",
  "Committee on Technology": "city-council.technology",
  "Committee on Transportation and Infrastructure": "city-council.transportation",
  "Committee on Veterans": "city-council.veterans",
  "Committee on Women and Gender Equity": "city-council.women-gender",
  "Subcommittee on Senior Centers and Food Insecurity": "city-council.subcommittee-seniors-food",
  "Subcommittee on COVID Recovery and Resiliency": "city-council.subcommittee-covid",
  "Subcommittee on Landmarks, Public Sitings and Dispositions": "city-council.subcommittee-landmarks",
  "Subcommittee on Zoning and Franchises": "city-council.subcommittee-zoning",
  "Task Force to Combat Hate": "city-council.taskforce-hate"
};

/**
 * Fetch data from Legistar API
 * @param {string} endpoint - API endpoint path
 * @param {string} token - API token (optional)
 * @returns {Promise<Object>}
 */
function fetchAPI(endpoint, token) {
  return new Promise((resolve, reject) => {
    // Add token as query parameter (Legistar style)
    const separator = endpoint.includes("?") ? "&" : "?";
    const url = token
      ? `${API_BASE}${endpoint}${separator}token=${token}`
      : `${API_BASE}${endpoint}`;

    console.log(`Fetching: ${API_BASE}${endpoint}`);

    https.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        console.log(`Response status: ${res.statusCode}`);
        if (res.statusCode !== 200) {
          reject(new Error(`API returned status ${res.statusCode}: ${data.substring(0, 200)}`));
          return;
        }
        try {
          const parsed = JSON.parse(data);
          console.log(`Parsed ${Array.isArray(parsed) ? parsed.length : 'non-array'} items`);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}, data: ${data.substring(0, 200)}`));
        }
      });
    }).on("error", reject);
  });
}

/**
 * Get org key from body name
 * @param {string} bodyName
 * @returns {string|null}
 */
function getOrgKey(bodyName) {
  // Try exact match first
  if (bodyNameToOrgKey[bodyName]) {
    return bodyNameToOrgKey[bodyName];
  }

  // Try partial match
  for (const [name, key] of Object.entries(bodyNameToOrgKey)) {
    if (bodyName.includes(name) || name.includes(bodyName)) {
      return key;
    }
  }

  // Default to generic city council if it contains "Committee"
  if (bodyName.includes("Committee") || bodyName.includes("Subcommittee")) {
    console.log(`Unknown committee: ${bodyName}`);
  }

  return null;
}

/**
 * Scrape City Council meetings
 * @param {string} token - Legistar API token
 * @returns {Promise<Array>} - Array of meeting objects
 */
async function scrapeCityCouncil(token) {
  const meetings = [];

  // Get events from the past month to 6 months in the future
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 6);

  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  try {
    // Fetch events with date filter
    const endpoint = `/events?$filter=EventDate+ge+datetime'${startStr}'+and+EventDate+lt+datetime'${endStr}'&$orderby=EventDate`;
    const events = await fetchAPI(endpoint, token);

    if (!Array.isArray(events)) {
      console.error("Unexpected response format:", events);
      return meetings;
    }

    for (const event of events) {
      const orgKey = getOrgKey(event.EventBodyName);
      if (!orgKey) continue;

      // Parse date and time
      const eventDate = new Date(event.EventDate);
      const dateStr = eventDate.toISOString().split("T")[0];

      // Parse time if available
      let timeStr = null;
      if (event.EventTime) {
        const timeParts = event.EventTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (timeParts) {
          let hours = parseInt(timeParts[1]);
          const minutes = timeParts[2];
          const ampm = timeParts[3];
          if (ampm && ampm.toUpperCase() === "PM" && hours < 12) hours += 12;
          if (ampm && ampm.toUpperCase() === "AM" && hours === 12) hours = 0;
          timeStr = `${String(hours).padStart(2, "0")}:${minutes}`;
        }
      }

      meetings.push({
        id: `cc-${event.EventId}`,
        org: orgKey,
        title: event.EventBodyName,
        date: dateStr,
        time: timeStr,
        location: event.EventLocation || "City Hall",
        description: event.EventAgendaStatusName || "",
        url: `https://legistar.council.nyc.gov/MeetingDetail.aspx?ID=${event.EventId}&GUID=${event.EventGuid}`
      });
    }
  } catch (err) {
    console.error("Error fetching City Council events:", err.message);
  }

  return meetings;
}

module.exports = { scrapeCityCouncil, getOrgKey };

// City Council Scraper
// Primary: Legistar OData API. Fallback: HTML scraping of Calendar.aspx

const https = require("https");
const cheerio = require("cheerio");

const LEGISTAR_TOKEN = process.env.LEGISTAR_TOKEN;
const API_BASE = "https://webapi.legistar.com/v1/nyc";
const CALENDAR_URL = "https://legistar.council.nyc.gov/Calendar.aspx";

// Map Legistar BodyId to our org keys
// IDs sourced from /v1/nyc/bodies?$filter=BodyActiveFlag eq 1
const bodyIdToOrgKey = {
  1: "city-council.stated",
  3: "city-council.aging",
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

// Map committee name (lowercase) to org key — used by HTML fallback
const bodyNameToOrgKey = {
  "city council": "city-council.stated",
  "city council stated meeting": "city-council.stated",
  "stated meeting": "city-council.stated",
  "committee on aging": "city-council.aging",
  "committee on children and youth": "city-council.children-youth",
  "committee on civil and human rights": "city-council.civil-human-rights",
  "committee on civil service and labor": "city-council.civil-service-labor",
  "committee to combat hate": "city-council.combat-hate",
  "committee on consumer and worker protection": "city-council.consumer-worker-protection",
  "committee on contracts": "city-council.contracts",
  "committee on criminal justice": "city-council.criminal-justice",
  "committee on cultural affairs, libraries and international relations": "city-council.cultural-affairs",
  "committee on cultural affairs & libraries": "city-council.cultural-affairs",
  "committee on disabilities": "city-council.disabilities",
  "committee on economic development": "city-council.economic-development",
  "committee on education": "city-council.education",
  "committee on environmental protection and waterfronts": "city-council.environmental-protection",
  "committee on environmental protection & waterfronts": "city-council.environmental-protection",
  "committee on finance": "city-council.finance",
  "committee on fire and emergency management": "city-council.fire-emergency",
  "committee on general welfare": "city-council.general-welfare",
  "committee on governmental operations, state & federal legislation": "city-council.governmental-operations",
  "committee on governmental operations": "city-council.governmental-operations",
  "committee on health": "city-council.health",
  "committee on higher education": "city-council.higher-education",
  "committee on hospitals": "city-council.hospitals",
  "committee on housing and buildings": "city-council.housing-buildings",
  "committee on immigration": "city-council.immigration",
  "committee on land use": "city-council.land-use",
  "committee on mental health and substance use": "city-council.mental-health",
  "committee on mental health and addiction": "city-council.mental-health",
  "committee on oversight and investigations": "city-council.oversight-investigations",
  "committee on parks and recreation": "city-council.parks-recreation",
  "committee on public housing": "city-council.public-housing",
  "committee on public safety": "city-council.public-safety",
  "committee on rules, privileges, elections, standards and ethics": "city-council.rules-privileges",
  "committee on rules, privileges, elections, standards & ethics": "city-council.rules-privileges",
  "committee on sanitation and solid waste management": "city-council.sanitation",
  "committee on small business": "city-council.small-business",
  "committee on technology": "city-council.technology",
  "committee on transportation and infrastructure": "city-council.transportation",
  "committee on veterans": "city-council.veterans",
  "committee on women and gender equity": "city-council.women-gender",
  "committee on workforce development": "city-council.workforce-development",
  "subcommittee on senior centers and food security": "city-council.subcommittee-seniors-food",
  "subcommittee on early childhood education": "city-council.subcommittee-early-childhood",
  "subcommittee on landmarks, public sitings, resiliency and dispositions": "city-council.subcommittee-landmarks",
  "subcommittee on zoning and franchises": "city-council.subcommittee-zoning",
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
 * Fetch URL and return response body as string
 */
function fetchUrl(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      reject(new Error(`Too many redirects for ${url}`));
      return;
    }

    const req = https.get(url, {
      headers: {
        Accept: "application/json, text/html",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      timeout: 15000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith("/")) {
          const urlObj = new URL(url);
          redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
        }
        fetchUrl(redirectUrl, maxRedirects - 1).then(resolve).catch(reject);
        return;
      }

      if (res.statusCode !== 200) {
        let body = "";
        res.on("data", chunk => body += chunk);
        res.on("end", () => reject(new Error(`HTTP ${res.statusCode} for ${url.split("?")[0]}: ${body.slice(0, 200)}`)));
        return;
      }
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);

    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request timed out for ${url}`));
    });
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
  const suffix = orgKey.replace("city-council.", "").replace(/-/g, " ");
  return `CC ${suffix.charAt(0).toUpperCase() + suffix.slice(1)}`;
}

/**
 * Build meeting description with livestream link
 */
function buildDescription(comment) {
  return "Livestream: https://council.nyc.gov/livestream/" + (comment ? "\n\n" + comment : "");
}

/**
 * Get org key from committee name (for HTML fallback)
 */
function getOrgKey(name) {
  const lower = name.toLowerCase().trim();
  if (bodyNameToOrgKey[lower]) return bodyNameToOrgKey[lower];
  for (const [key, value] of Object.entries(bodyNameToOrgKey)) {
    if (lower.includes(key) || key.includes(lower)) return value;
  }
  if (lower.includes("committee") || lower.includes("subcommittee")) {
    console.log(`Unknown City Council body: ${name}`);
  }
  return null;
}

// ── PRIMARY: Legistar API ──────────────────────────────────────────────

async function scrapeViaAPI() {
  if (!LEGISTAR_TOKEN) throw new Error("LEGISTAR_TOKEN not set");

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  const fromDate = oneMonthAgo.toISOString().split("T")[0];
  const toDate = sixMonthsLater.toISOString().split("T")[0];

  const filter = encodeURIComponent(`EventDate ge datetime'${fromDate}' and EventDate le datetime'${toDate}'`);
  const orderby = encodeURIComponent("EventDate desc");
  const token = encodeURIComponent(LEGISTAR_TOKEN);
  const url = `${API_BASE}/events?$filter=${filter}&$orderby=${orderby}&$top=500&Token=${token}`;

  const raw = await fetchUrl(url);
  const events = JSON.parse(raw);

  if (!Array.isArray(events)) throw new Error("Unexpected API response format");

  const meetings = [];
  for (const event of events) {
    const orgKey = bodyIdToOrgKey[event.EventBodyId];
    if (!orgKey) continue;

    const eventDate = new Date(event.EventDate);
    const year = eventDate.getFullYear();
    const month = String(eventDate.getMonth() + 1).padStart(2, "0");
    const day = String(eventDate.getDate()).padStart(2, "0");
    const dateFormatted = `${year}-${month}-${day}`;

    meetings.push({
      id: `cc-${orgKey.replace(/\./g, "-")}-${dateFormatted}`,
      org: orgKey,
      title: buildTitle(orgKey),
      date: dateFormatted,
      time: parseTime(event.EventTime),
      location: event.EventLocation || "City Hall, New York, NY",
      description: buildDescription(event.EventComment),
      url: event.EventInSiteURL || CALENDAR_URL,
      agendaUrl: event.EventAgendaFile || null,
    });
  }

  console.log(`City Council: ${meetings.length} meetings via API`);
  return meetings;
}

// ── FALLBACK: HTML scraping ────────────────────────────────────────────

async function scrapeViaHTML() {
  const currentYear = new Date().getFullYear();
  const url = `${CALENDAR_URL}?Mode=List&Year=${currentYear}`;
  const html = await fetchUrl(url);
  const $ = cheerio.load(html);

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  const meetings = [];

  $("tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 5) return;

    const name = $(cells[0]).text().trim();
    const dateStr = $(cells[1]).text().trim();
    const timeStr = $(cells[3]).text().trim();
    const location = $(cells[4]).text().trim();

    if (!dateStr.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) return;

    const dateMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!dateMatch) return;
    const meetingDate = new Date(parseInt(dateMatch[3]), parseInt(dateMatch[1]) - 1, parseInt(dateMatch[2]));

    if (meetingDate < oneMonthAgo || meetingDate > sixMonthsLater) return;

    const orgKey = getOrgKey(name);
    if (!orgKey) return;

    const year = meetingDate.getFullYear();
    const month = String(meetingDate.getMonth() + 1).padStart(2, "0");
    const day = String(meetingDate.getDate()).padStart(2, "0");
    const dateFormatted = `${year}-${month}-${day}`;

    const link = $(cells[0]).find("a").attr("href") || "";
    const fullUrl = link.startsWith("http") ? link
      : link ? `https://legistar.council.nyc.gov/${link}` : CALENDAR_URL;

    meetings.push({
      id: `cc-${orgKey.replace(/\./g, "-")}-${dateFormatted}`,
      org: orgKey,
      title: buildTitle(orgKey),
      date: dateFormatted,
      time: parseTime(timeStr),
      location: location || "City Hall, New York, NY",
      description: buildDescription(),
      url: fullUrl,
      agendaUrl: null,
    });
  });

  console.log(`City Council: ${meetings.length} meetings via HTML fallback`);
  return meetings;
}

// ── MAIN: try API, fall back to HTML ───────────────────────────────────

async function scrapeCityCouncil() {
  try {
    return await scrapeViaAPI();
  } catch (apiErr) {
    console.warn(`Legistar API failed (${apiErr.message}), falling back to HTML scraping`);
    return await scrapeViaHTML();
  }
}

module.exports = { scrapeCityCouncil, bodyIdToOrgKey, orgKeyToShortName, buildTitle };

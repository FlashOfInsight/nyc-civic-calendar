// NYC Agencies Scraper
// DOB live Q&A sessions and DOE Panel for Educational Policy meetings

const cheerio = require("cheerio");
const { fetchHTML, parseMonth, formatDate } = require("../scraper-utils");

const DOB_URL = "https://www.nyc.gov/site/buildings/dob/upcoming-events.page";
const DOE_PEP_URL = "https://www.schools.nyc.gov/get-involved/families/panel-for-education-policy/panel-meetings";

/** "2:00pm" / "6:00 PM" / "6pm" → "14:00"; null if there is no time */
function to24h(text) {
  const m = String(text || "").match(/(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?/i);
  if (!m) return null;
  let h = parseInt(m[1]) % 12;
  if (m[3].toLowerCase() === "p") h += 12;
  return `${String(h).padStart(2, "0")}:${m[2] || "00"}`;
}

function clean(text) {
  return String(text || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
}

/**
 * DOB live Q&A sessions: a two-column table, borough | session date, e.g.
 * "Staten Island" | "Tuesday November 10th, 2026 - 2:00pm - 3:30pm".
 */
async function scrapeDOB() {
  const meetings = [];
  const seen = new Set();
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const sixMonthsLater = new Date(); sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  try {
    const $ = cheerio.load(await fetchHTML(DOB_URL));

    $("table tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 2) return;
      const borough = clean($(cells[0]).text());
      const when = clean($(cells[1]).text());
      if (!/^(Bronx|Brooklyn|Manhattan|Queens|Staten Island)$/i.test(borough)) return;

      // Weekday, optional comma, month, day with optional "th", optional year
      const dateMatch = when.match(/(?:\w+day),?\s+(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i);
      if (!dateMatch) return;
      const month = parseMonth(dateMatch[1]);
      if (month === -1) return;
      const day = parseInt(dateMatch[2]);
      let year = dateMatch[3] ? parseInt(dateMatch[3]) : now.getFullYear();
      if (!dateMatch[3] && new Date(year, month, day) < new Date(now.getFullYear(), now.getMonth() - 1, 1)) year++;

      const meetingDate = new Date(year, month, day);
      if (meetingDate < now || meetingDate > sixMonthsLater) return;

      // "2:00pm - 3:30pm", "2:00pm to 3:30pm", or "2:00 - 3:30pm" (first time borrows the am/pm)
      const range = when.slice(dateMatch.index + dateMatch[0].length)
        .match(/(\d{1,2}(?::\d{2})?)\s*([ap]\.?m\.?)?\s*(?:-|–|to)\s*(\d{1,2}(?::\d{2})?)\s*([ap]\.?m\.?)/i);
      const start = (range && to24h(`${range[1]} ${range[2] || range[4]}`)) || "14:00";
      const end = range ? to24h(`${range[3]} ${range[4]}`) : null;
      const dateStr = formatDate(year, month, day);
      const id = `dob-qa-${borough.toLowerCase().replace(/\s+/g, "-")}-${dateStr}`;
      if (seen.has(id)) return;
      seen.add(id);

      const link = $(cells[1]).find("a[href]").attr("href");
      meetings.push({
        id,
        org: "city-agencies.dob.qa-sessions",
        title: `DOB Q&A Session - ${borough}`,
        date: dateStr,
        time: start,
        endTime: end && end > start ? end : undefined,
        location: "Virtual (Zoom)",
        description: "Live Q&A session for job-specific filing questions, permits, codes, violations, and compliance matters. Registration required.",
        url: link && /^https?:/.test(link) ? link : DOB_URL
      });
    });
  } catch (err) {
    console.error("Error scraping DOB:", err.message);
  }

  return meetings;
}

/**
 * DOE Panel for Educational Policy. Each meeting is an accordion whose heading
 * reads "PEP Meeting — December 16, 2026" or "Bylaws Committee — November 16, 2026";
 * the first paragraph underneath gives the time and place. Only those headings
 * are read, so other dates on the page (deadlines, past minutes) are ignored.
 */
async function scrapeDOEPEP() {
  const meetings = [];
  const seen = new Set();
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const sixMonthsLater = new Date(); sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  try {
    const $ = cheerio.load(await fetchHTML(DOE_PEP_URL));

    $("h2, h3, h4").each((_, heading) => {
      const text = clean($(heading).text());
      const m = text.match(/^(.{3,90}?)\s*[—–-]\s*(\w+)\s+(\d{1,2}),?\s+(\d{4})$/);
      if (!m) return;
      const month = parseMonth(m[2]);
      if (month === -1) return;
      const day = parseInt(m[3]), year = parseInt(m[4]);
      const meetingDate = new Date(year, month, day);
      if (meetingDate < now || meetingDate > sixMonthsLater) return;

      const name = m[1].trim();
      const isPanel = /^PEP Meeting$/i.test(name) || /panel/i.test(name);
      const dateStr = formatDate(year, month, day);
      const id = isPanel ? `doe-pep-${dateStr}` : `doe-pep-${dateStr}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;
      if (seen.has(id)) return;
      seen.add(id);

      // Details live in the accordion panel that follows the heading's link
      const panel = $(heading).closest("a").next(".panel");
      const details = clean((panel.length ? panel : $(heading).parent().next()).find("p").first().text());
      const time = to24h((details.match(/\bat\s+(\d{1,2}(?::\d{2})?\s*[ap]\.?m\.?)/i) || [])[1]) || "18:00";
      // "... (EST) at Curtis High School (105 Hamilton Avenue, ...)." or
      // "... in Room 152 of Tweed Courthouse (52 Chambers Street, ...)."
      const place = details.match(/[ap]\.?m\.?\s*(?:\([A-Z]{2,4}\))?\s+(?:at|in)\s+(.+?\))/i);
      const location = place ? clean(place[1]) : "See schools.nyc.gov for location";

      meetings.push({
        id,
        org: "city-agencies.doe.pep",
        title: isPanel ? "Panel for Educational Policy Meeting" : `Panel for Educational Policy: ${name}`,
        date: dateStr,
        time,
        location,
        description: `${isPanel ? "Monthly meeting of the NYC Panel for Educational Policy." : `${name} of the NYC Panel for Educational Policy.`} Live-streamed at learndoe.org/pep.`,
        url: DOE_PEP_URL
      });
    });
  } catch (err) {
    console.error("Error scraping DOE PEP:", err.message);
  }

  return meetings;
}

async function scrapeAgencies() {
  const dobMeetings = await scrapeDOB();
  console.log(`DOB scraper found ${dobMeetings.length} meetings`);

  const pepMeetings = await scrapeDOEPEP();
  console.log(`DOE PEP scraper found ${pepMeetings.length} meetings`);

  const meetings = [...dobMeetings, ...pepMeetings];
  console.log(`Agencies scraper found ${meetings.length} total meetings`);
  return meetings;
}

module.exports = { scrapeAgencies, scrapeDOB, scrapeDOEPEP };

#!/usr/bin/env node
// One-time script to scrape NYPD precinct pages and extract meeting patterns
// Run with: node scripts/scrape-nypd-patterns.js

const https = require("https");

const PRECINCTS = {
  manhattan: [
    { id: "1", name: "1st Precinct", path: "1st-precinct" },
    { id: "5", name: "5th Precinct", path: "5th-precinct" },
    { id: "6", name: "6th Precinct", path: "6th-precinct" },
    { id: "7", name: "7th Precinct", path: "7th-precinct" },
    { id: "9", name: "9th Precinct", path: "9th-precinct" },
    { id: "10", name: "10th Precinct", path: "10th-precinct" },
    { id: "13", name: "13th Precinct", path: "13th-precinct" },
    { id: "mts", name: "Midtown South Precinct", path: "midtown-south-precinct" },
    { id: "17", name: "17th Precinct", path: "17th-precinct" },
    { id: "mtn", name: "Midtown North Precinct", path: "midtown-north-precinct" },
    { id: "19", name: "19th Precinct", path: "19th-precinct" },
    { id: "20", name: "20th Precinct", path: "20th-precinct" },
    { id: "cp", name: "Central Park Precinct", path: "central-park-precinct" },
    { id: "23", name: "23rd Precinct", path: "23rd-precinct" },
    { id: "24", name: "24th Precinct", path: "24th-precinct" },
    { id: "25", name: "25th Precinct", path: "25th-precinct" },
    { id: "26", name: "26th Precinct", path: "26th-precinct" },
    { id: "28", name: "28th Precinct", path: "28th-precinct" },
    { id: "30", name: "30th Precinct", path: "30th-precinct" },
    { id: "32", name: "32nd Precinct", path: "32nd-precinct" },
    { id: "33", name: "33rd Precinct", path: "33rd-precinct" },
    { id: "34", name: "34th Precinct", path: "34th-precinct" },
  ],
  bronx: [
    { id: "40", name: "40th Precinct", path: "40th-precinct" },
    { id: "41", name: "41st Precinct", path: "41st-precinct" },
    { id: "42", name: "42nd Precinct", path: "42nd-precinct" },
    { id: "43", name: "43rd Precinct", path: "43rd-precinct" },
    { id: "44", name: "44th Precinct", path: "44th-precinct" },
    { id: "45", name: "45th Precinct", path: "45th-precinct" },
    { id: "46", name: "46th Precinct", path: "46th-precinct" },
    { id: "47", name: "47th Precinct", path: "47th-precinct" },
    { id: "48", name: "48th Precinct", path: "48th-precinct" },
    { id: "49", name: "49th Precinct", path: "49th-precinct" },
    { id: "50", name: "50th Precinct", path: "50th-precinct" },
    { id: "52", name: "52nd Precinct", path: "52nd-precinct" },
  ],
  brooklyn: [
    { id: "60", name: "60th Precinct", path: "60th-precinct" },
    { id: "61", name: "61st Precinct", path: "61st-precinct" },
    { id: "62", name: "62nd Precinct", path: "62nd-precinct" },
    { id: "63", name: "63rd Precinct", path: "63rd-precinct" },
    { id: "66", name: "66th Precinct", path: "66th-precinct" },
    { id: "67", name: "67th Precinct", path: "67th-precinct" },
    { id: "68", name: "68th Precinct", path: "68th-precinct" },
    { id: "69", name: "69th Precinct", path: "69th-precinct" },
    { id: "70", name: "70th Precinct", path: "70th-precinct" },
    { id: "71", name: "71st Precinct", path: "71st-precinct" },
    { id: "72", name: "72nd Precinct", path: "72nd-precinct" },
    { id: "73", name: "73rd Precinct", path: "73rd-precinct" },
    { id: "75", name: "75th Precinct", path: "75th-precinct" },
    { id: "76", name: "76th Precinct", path: "76th-precinct" },
    { id: "77", name: "77th Precinct", path: "77th-precinct" },
    { id: "78", name: "78th Precinct", path: "78th-precinct" },
    { id: "79", name: "79th Precinct", path: "79th-precinct" },
    { id: "81", name: "81st Precinct", path: "81st-precinct" },
    { id: "83", name: "83rd Precinct", path: "83rd-precinct" },
    { id: "84", name: "84th Precinct", path: "84th-precinct" },
    { id: "88", name: "88th Precinct", path: "88th-precinct" },
    { id: "90", name: "90th Precinct", path: "90th-precinct" },
    { id: "94", name: "94th Precinct", path: "94th-precinct" },
  ],
  queens: [
    { id: "100", name: "100th Precinct", path: "100th-precinct" },
    { id: "101", name: "101st Precinct", path: "101st-precinct" },
    { id: "102", name: "102nd Precinct", path: "102nd-precinct" },
    { id: "103", name: "103rd Precinct", path: "103rd-precinct" },
    { id: "104", name: "104th Precinct", path: "104th-precinct" },
    { id: "105", name: "105th Precinct", path: "105th-precinct" },
    { id: "106", name: "106th Precinct", path: "106th-precinct" },
    { id: "107", name: "107th Precinct", path: "107th-precinct" },
    { id: "108", name: "108th Precinct", path: "108th-precinct" },
    { id: "109", name: "109th Precinct", path: "109th-precinct" },
    { id: "110", name: "110th Precinct", path: "110th-precinct" },
    { id: "111", name: "111th Precinct", path: "111th-precinct" },
    { id: "112", name: "112th Precinct", path: "112th-precinct" },
    { id: "113", name: "113th Precinct", path: "113th-precinct" },
    { id: "114", name: "114th Precinct", path: "114th-precinct" },
    { id: "115", name: "115th Precinct", path: "115th-precinct" },
    { id: "116", name: "116th Precinct", path: "116th-precinct" },
  ],
  "staten-island": [
    { id: "120", name: "120th Precinct", path: "120th-precinct" },
    { id: "121", name: "121st Precinct", path: "121st-precinct" },
    { id: "122", name: "122nd Precinct", path: "122nd-precinct" },
    { id: "123", name: "123rd Precinct", path: "123rd-precinct" },
  ],
};

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NYCCivicCalendar/1.0)" }
    }, (res) => {
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

function parsePattern(text) {
  // Common patterns:
  // "last Wednesday of each month at 7 PM"
  // "third Thursday of each month at 7:30 PM"
  // "first Tuesday of each month at 7:00 PM"
  // "second Wednesday of the month at 7:00 PM"

  const ordinals = {
    "first": 1, "1st": 1,
    "second": 2, "2nd": 2,
    "third": 3, "3rd": 3,
    "fourth": 4, "4th": 4,
    "last": -1
  };

  const days = {
    "sunday": 0, "monday": 1, "tuesday": 2, "wednesday": 3,
    "thursday": 4, "friday": 5, "saturday": 6
  };

  // Pattern: (ordinal) (day) of (each/the) month at (time)
  const pattern = /(first|second|third|fourth|last|1st|2nd|3rd|4th)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s+(?:of\s+)?(?:each|the|every)?\s*month\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;

  const match = text.match(pattern);
  if (!match) return null;

  const ordinal = ordinals[match[1].toLowerCase()];
  const dayOfWeek = days[match[2].toLowerCase()];
  let hours = parseInt(match[3]);
  const minutes = match[4] ? parseInt(match[4]) : 0;
  const ampm = (match[5] || "pm").toLowerCase();

  // Convert to 24-hour
  if (ampm === "pm" && hours < 12) hours += 12;
  if (ampm === "am" && hours === 12) hours = 0;

  return {
    weekOfMonth: ordinal, // 1-4 or -1 for last
    dayOfWeek: dayOfWeek, // 0-6
    hour: hours,
    minute: minutes
  };
}

function extractAddress(text) {
  // Look for address pattern
  const addressPattern = /(\d+[\-\d]*\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Place|Pl|Drive|Dr|Way|Lane|Ln)[,.\s]+(?:New York|Brooklyn|Bronx|Queens|Staten Island)[,\s]+(?:NY|New York)\s*\d{5})/i;
  const match = text.match(addressPattern);
  return match ? match[1].trim() : null;
}

async function scrapePrecinct(borough, precinct) {
  const url = `https://www.nyc.gov/site/nypd/bureaus/patrol/precincts/${precinct.path}.page`;

  try {
    const html = await fetchPage(url);

    // Extract community council meeting info
    const ccPattern = /community\s+council\s+meetings?\s+(?:typically\s+)?(?:take\s+place\s+|are\s+held\s+)?(?:on\s+)?(?:the\s+)?([^.]+(?:at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?)/i;
    const match = html.match(ccPattern);

    let pattern = null;
    let rawText = null;

    if (match) {
      rawText = match[1].trim();
      pattern = parsePattern(rawText);
    }

    // Try to find address
    const address = extractAddress(html);

    return {
      id: precinct.id,
      name: precinct.name,
      borough: borough,
      url: url,
      rawText: rawText,
      pattern: pattern,
      address: address
    };
  } catch (err) {
    console.error(`Error scraping ${precinct.name}: ${err.message}`);
    return {
      id: precinct.id,
      name: precinct.name,
      borough: borough,
      url: `https://www.nyc.gov/site/nypd/bureaus/patrol/precincts/${precinct.path}.page`,
      error: err.message
    };
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log("Scraping NYPD precinct meeting patterns...\n");

  const results = {
    scrapedAt: new Date().toISOString(),
    precincts: {}
  };

  let total = 0;
  let found = 0;

  for (const [borough, precincts] of Object.entries(PRECINCTS)) {
    console.log(`\n=== ${borough.toUpperCase()} ===`);
    results.precincts[borough] = [];

    for (const precinct of precincts) {
      total++;
      const data = await scrapePrecinct(borough, precinct);
      results.precincts[borough].push(data);

      if (data.pattern) {
        found++;
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const ordinals = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", "-1": "Last" };
        console.log(`  ${precinct.name}: ${ordinals[data.pattern.weekOfMonth]} ${dayNames[data.pattern.dayOfWeek]} at ${data.pattern.hour}:${String(data.pattern.minute).padStart(2, "0")}`);
      } else if (data.rawText) {
        console.log(`  ${precinct.name}: "${data.rawText}" (could not parse)`);
      } else if (data.error) {
        console.log(`  ${precinct.name}: ERROR - ${data.error}`);
      } else {
        console.log(`  ${precinct.name}: No meeting info found`);
      }

      // Rate limit to avoid overwhelming the server
      await sleep(200);
    }
  }

  console.log(`\n\nSummary: Found patterns for ${found}/${total} precincts`);

  // Output JSON
  console.log("\n\n=== JSON OUTPUT ===\n");
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);

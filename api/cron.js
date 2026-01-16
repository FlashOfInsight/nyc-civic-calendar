// Cron job endpoint for refreshing meeting data
// Triggered weekly by Vercel Cron
//
// FUTURE-PROOFING: This cron job is designed to be resilient to scraper failures.
// - Never overwrites good data with empty data
// - Merges new meetings with existing future meetings
// - Preserves active-orgs stability across runs

const { put, list } = require("@vercel/blob");
const { scrapeCityCouncil } = require("../lib/scrapers/city-council");
const { scrapeMTA } = require("../lib/scrapers/mta");
const { scrapeAgencies } = require("../lib/scrapers/agencies");
const { scrapeManhattanCBs, scrapeBrooklynCBs, scrapeQueensCBs, scrapeBronxCBs, scrapeStatenIslandCBs } = require("../lib/scrapers/community-boards");
const { scrapeOversightBoards } = require("../lib/scrapers/oversight-boards");
const { scrapeNYCRules } = require("../lib/scrapers/nyc-rules");

// Blob storage base URL
const BLOB_BASE = process.env.BLOB_BASE_URL;

// Minimum expected meetings per source (if scraper returns fewer, something is wrong)
const MIN_EXPECTED_MEETINGS = {
  "city-council.json": 5,
  "mta.json": 3,
  "agencies.json": 3,
  "community-boards.json": 10,
  "oversight-boards.json": 5,  // CCRB, LPC, BSA, RGB combined
  "nyc-rules.json": 1          // Varies based on active rulemaking
};

/**
 * Load existing meetings from Vercel Blob storage
 * @param {string} filename
 * @returns {Promise<{meetings: Array, lastUpdated: string|null}>}
 */
async function loadExistingMeetings(filename) {
  try {
    // Try direct URL first
    if (BLOB_BASE) {
      const response = await fetch(`${BLOB_BASE}/${filename}`);
      if (response.ok) {
        const data = await response.json();
        return { meetings: data.meetings || [], lastUpdated: data.lastUpdated || null };
      }
    }

    // Fallback: list blobs
    const { blobs } = await list({ prefix: filename.replace(".json", "") });
    if (blobs.length > 0) {
      const response = await fetch(blobs[0].url);
      if (response.ok) {
        const data = await response.json();
        return { meetings: data.meetings || [], lastUpdated: data.lastUpdated || null };
      }
    }
  } catch (err) {
    console.error(`Error loading existing ${filename}:`, err.message);
  }

  return { meetings: [], lastUpdated: null };
}

/**
 * Filter meetings to only include future meetings (from yesterday onwards)
 * @param {Array} meetings
 * @returns {Array}
 */
function filterFutureMeetings(meetings) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const cutoff = yesterday.toISOString().split("T")[0];

  return meetings.filter(m => m.date >= cutoff);
}

/**
 * Merge existing and new meetings, deduplicating by ID
 * @param {Array} existingMeetings
 * @param {Array} newMeetings
 * @returns {Array}
 */
function mergeMeetings(existingMeetings, newMeetings) {
  const meetingsById = new Map();

  // Add existing future meetings first
  for (const meeting of filterFutureMeetings(existingMeetings)) {
    meetingsById.set(meeting.id, meeting);
  }

  // New meetings overwrite existing ones with same ID
  for (const meeting of newMeetings) {
    meetingsById.set(meeting.id, meeting);
  }

  return [...meetingsById.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Write meetings to Vercel Blob storage with validation
 * @param {string} filename
 * @param {Array} newMeetings - Newly scraped meetings
 * @returns {Promise<{written: boolean, count: number, preserved: number, reason: string|null}>}
 */
async function writeMeetings(filename, newMeetings) {
  const minExpected = MIN_EXPECTED_MEETINGS[filename] || 1;
  const existing = await loadExistingMeetings(filename);
  const existingFuture = filterFutureMeetings(existing.meetings);

  // Case 1: Scraper returned good data - merge and write
  if (newMeetings.length >= minExpected) {
    const merged = mergeMeetings(existing.meetings, newMeetings);
    const data = {
      meetings: merged,
      lastUpdated: new Date().toISOString(),
      lastScraperRun: {
        timestamp: new Date().toISOString(),
        scraperFound: newMeetings.length,
        totalAfterMerge: merged.length
      }
    };

    await put(filename, JSON.stringify(data, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true
    });

    console.log(`[${filename}] Wrote ${merged.length} meetings (${newMeetings.length} new, merged with existing)`);
    return { written: true, count: merged.length, preserved: 0, reason: null };
  }

  // Case 2: Scraper returned too few results but we have existing data - preserve it
  if (existingFuture.length > 0) {
    console.warn(`[${filename}] Scraper returned ${newMeetings.length} meetings (min: ${minExpected}). Preserving ${existingFuture.length} existing future meetings.`);

    // Still merge what we got (might be partial success)
    const merged = mergeMeetings(existing.meetings, newMeetings);
    const data = {
      meetings: merged,
      lastUpdated: existing.lastUpdated, // Keep old timestamp to indicate data is stale
      lastScraperRun: {
        timestamp: new Date().toISOString(),
        scraperFound: newMeetings.length,
        belowThreshold: true,
        preserved: existingFuture.length
      }
    };

    await put(filename, JSON.stringify(data, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true
    });

    return { written: true, count: merged.length, preserved: existingFuture.length, reason: "below_threshold" };
  }

  // Case 3: Scraper returned too few and no existing data - write what we have
  console.warn(`[${filename}] Scraper returned ${newMeetings.length} meetings (min: ${minExpected}). No existing data to preserve.`);
  const data = {
    meetings: newMeetings,
    lastUpdated: new Date().toISOString(),
    lastScraperRun: {
      timestamp: new Date().toISOString(),
      scraperFound: newMeetings.length,
      belowThreshold: true,
      noExistingData: true
    }
  };

  await put(filename, JSON.stringify(data, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true
  });

  return { written: true, count: newMeetings.length, preserved: 0, reason: "no_existing_data" };
}

/**
 * Extract unique org keys from all meetings
 * @param {Array} allMeetings - Combined array of all meetings
 * @returns {Array} - Sorted array of unique org keys
 */
function extractActiveOrgs(allMeetings) {
  const orgKeys = new Set();
  for (const meeting of allMeetings) {
    if (meeting.org) {
      orgKeys.add(meeting.org);
    }
  }
  return [...orgKeys].sort();
}

/**
 * Load existing active orgs from Vercel Blob storage
 * @returns {Promise<Array>}
 */
async function loadExistingActiveOrgs() {
  try {
    if (BLOB_BASE) {
      const response = await fetch(`${BLOB_BASE}/active-orgs.json`);
      if (response.ok) {
        const data = await response.json();
        return data.activeOrgs || [];
      }
    }

    const { blobs } = await list({ prefix: "active-orgs" });
    if (blobs.length > 0) {
      const response = await fetch(blobs[0].url);
      if (response.ok) {
        const data = await response.json();
        return data.activeOrgs || [];
      }
    }
  } catch (err) {
    console.error("Error loading existing active orgs:", err.message);
  }

  return [];
}

/**
 * Write active orgs to Vercel Blob storage
 * Merges with existing to prevent sudden disappearance of orgs
 * @param {Array} newActiveOrgs - Array of active org keys from current scrape
 */
async function writeActiveOrgs(newActiveOrgs) {
  const existingActiveOrgs = await loadExistingActiveOrgs();

  // Merge: keep existing orgs that aren't in new list (they might just be temporarily missing)
  // but mark them so we can track staleness
  const mergedOrgs = new Set([...existingActiveOrgs, ...newActiveOrgs]);

  const data = {
    activeOrgs: [...mergedOrgs].sort(),
    lastUpdated: new Date().toISOString(),
    currentRunOrgs: newActiveOrgs.length,
    totalOrgs: mergedOrgs.size
  };

  await put("active-orgs.json", JSON.stringify(data, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true
  });

  console.log(`Wrote ${mergedOrgs.size} active org keys (${newActiveOrgs.length} from current run, ${existingActiveOrgs.length} existing)`);
}

module.exports = async function handler(req, res) {
  // Verify authorization for cron endpoint
  // Allow: Vercel cron (with CRON_SECRET), or manual trigger with ?secret= param
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.authorization === `Bearer ${cronSecret}`;
  const isManualTrigger = req.query.secret && req.query.secret === process.env.REFRESH_SECRET;

  if (process.env.VERCEL && !isVercelCron && !isManualTrigger) {
    res.status(401).json({
      error: "Unauthorized",
      hint: "Add REFRESH_SECRET env var and use ?secret=YOUR_SECRET to trigger manually"
    });
    return;
  }

  const results = {
    cityCouncil: { success: false, count: 0, error: null, meetings: [], writeResult: null },
    mta: { success: false, count: 0, error: null, meetings: [], writeResult: null },
    agencies: { success: false, count: 0, error: null, meetings: [], writeResult: null },
    communityBoards: { success: false, count: 0, error: null, meetings: [], writeResult: null },
    oversightBoards: { success: false, count: 0, error: null, meetings: [], writeResult: null },
    nycRules: { success: false, count: 0, error: null, meetings: [], writeResult: null }
  };

  // Scrape City Council
  try {
    const meetings = await scrapeCityCouncil();
    const writeResult = await writeMeetings("city-council.json", meetings);
    results.cityCouncil.success = true;
    results.cityCouncil.count = meetings.length;
    results.cityCouncil.meetings = meetings;
    results.cityCouncil.writeResult = writeResult;
  } catch (err) {
    console.error("City Council scraper error:", err.message);
    results.cityCouncil.error = err.message;
    // On error, try to preserve existing data
    const writeResult = await writeMeetings("city-council.json", []);
    results.cityCouncil.writeResult = writeResult;
  }

  // Scrape MTA
  try {
    const meetings = await scrapeMTA();
    const writeResult = await writeMeetings("mta.json", meetings);
    results.mta.success = true;
    results.mta.count = meetings.length;
    results.mta.meetings = meetings;
    results.mta.writeResult = writeResult;
  } catch (err) {
    console.error("MTA scraper error:", err.message);
    results.mta.error = err.message;
    const writeResult = await writeMeetings("mta.json", []);
    results.mta.writeResult = writeResult;
  }

  // Scrape Agencies
  try {
    const meetings = await scrapeAgencies();
    const writeResult = await writeMeetings("agencies.json", meetings);
    results.agencies.success = true;
    results.agencies.count = meetings.length;
    results.agencies.meetings = meetings;
    results.agencies.writeResult = writeResult;
  } catch (err) {
    console.error("Agencies scraper error:", err.message);
    results.agencies.error = err.message;
    const writeResult = await writeMeetings("agencies.json", []);
    results.agencies.writeResult = writeResult;
  }

  // Scrape Community Boards (all 5 boroughs)
  try {
    const manhattanMeetings = await scrapeManhattanCBs();
    const brooklynMeetings = await scrapeBrooklynCBs();
    const queensMeetings = await scrapeQueensCBs();
    const bronxMeetings = await scrapeBronxCBs();
    const statenIslandMeetings = await scrapeStatenIslandCBs();
    const allCBMeetings = [...manhattanMeetings, ...brooklynMeetings, ...queensMeetings, ...bronxMeetings, ...statenIslandMeetings];
    const writeResult = await writeMeetings("community-boards.json", allCBMeetings);
    results.communityBoards.success = true;
    results.communityBoards.count = allCBMeetings.length;
    results.communityBoards.meetings = allCBMeetings;
    results.communityBoards.writeResult = writeResult;
  } catch (err) {
    console.error("Community Boards scraper error:", err.message);
    results.communityBoards.error = err.message;
    const writeResult = await writeMeetings("community-boards.json", []);
    results.communityBoards.writeResult = writeResult;
  }

  // Scrape Oversight Boards (CCRB, LPC, BSA, RGB)
  try {
    const meetings = await scrapeOversightBoards();
    const writeResult = await writeMeetings("oversight-boards.json", meetings);
    results.oversightBoards.success = true;
    results.oversightBoards.count = meetings.length;
    results.oversightBoards.meetings = meetings;
    results.oversightBoards.writeResult = writeResult;
  } catch (err) {
    console.error("Oversight Boards scraper error:", err.message);
    results.oversightBoards.error = err.message;
    const writeResult = await writeMeetings("oversight-boards.json", []);
    results.oversightBoards.writeResult = writeResult;
  }

  // Scrape NYC Rules (rulemaking hearings for all agencies)
  try {
    const meetings = await scrapeNYCRules();
    const writeResult = await writeMeetings("nyc-rules.json", meetings);
    results.nycRules.success = true;
    results.nycRules.count = meetings.length;
    results.nycRules.meetings = meetings;
    results.nycRules.writeResult = writeResult;
  } catch (err) {
    console.error("NYC Rules scraper error:", err.message);
    results.nycRules.error = err.message;
    const writeResult = await writeMeetings("nyc-rules.json", []);
    results.nycRules.writeResult = writeResult;
  }

  // Compute and save active orgs from all scraped meetings
  const allMeetings = [
    ...results.cityCouncil.meetings,
    ...results.mta.meetings,
    ...results.agencies.meetings,
    ...results.communityBoards.meetings,
    ...results.oversightBoards.meetings,
    ...results.nycRules.meetings
  ];
  const activeOrgs = extractActiveOrgs(allMeetings);
  await writeActiveOrgs(activeOrgs);

  // Return results (without meetings array to keep response small)
  const totalMeetings = results.cityCouncil.count + results.mta.count + results.agencies.count +
    results.communityBoards.count + results.oversightBoards.count + results.nycRules.count;
  const allSuccess = results.cityCouncil.success && results.mta.success && results.agencies.success &&
    results.communityBoards.success && results.oversightBoards.success && results.nycRules.success;

  res.status(allSuccess ? 200 : 207).json({
    success: allSuccess,
    timestamp: new Date().toISOString(),
    totalMeetings,
    activeOrgCount: activeOrgs.length,
    results: {
      cityCouncil: {
        success: results.cityCouncil.success,
        count: results.cityCouncil.count,
        error: results.cityCouncil.error,
        preserved: results.cityCouncil.writeResult?.preserved || 0
      },
      mta: {
        success: results.mta.success,
        count: results.mta.count,
        error: results.mta.error,
        preserved: results.mta.writeResult?.preserved || 0
      },
      agencies: {
        success: results.agencies.success,
        count: results.agencies.count,
        error: results.agencies.error,
        preserved: results.agencies.writeResult?.preserved || 0
      },
      communityBoards: {
        success: results.communityBoards.success,
        count: results.communityBoards.count,
        error: results.communityBoards.error,
        preserved: results.communityBoards.writeResult?.preserved || 0
      },
      oversightBoards: {
        success: results.oversightBoards.success,
        count: results.oversightBoards.count,
        error: results.oversightBoards.error,
        preserved: results.oversightBoards.writeResult?.preserved || 0
      },
      nycRules: {
        success: results.nycRules.success,
        count: results.nycRules.count,
        error: results.nycRules.error,
        preserved: results.nycRules.writeResult?.preserved || 0
      }
    }
  });
};

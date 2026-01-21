// Cron job endpoint for refreshing meeting data
// Triggered weekly by Vercel Cron
//
// FUTURE-PROOFING: This cron job is designed to be resilient to scraper failures.
// - Never overwrites good data with empty data
// - Merges new meetings with existing future meetings
// - Preserves active-orgs stability across runs
//
// STORAGE: Uses GitHub Gist instead of Vercel Blob to avoid operation limits

const { readFromGist, writeToGist, prepareGistFile } = require("../lib/gist-storage");
const { scrapeCityCouncil } = require("../lib/scrapers/city-council");
const { scrapeMTA } = require("../lib/scrapers/mta");
const { scrapeAgencies } = require("../lib/scrapers/agencies");
const { scrapeManhattanCBs, scrapeBrooklynCBs, scrapeQueensCBs, scrapeBronxCBs, scrapeStatenIslandCBs } = require("../lib/scrapers/community-boards");
const { scrapeOversightBoards } = require("../lib/scrapers/oversight-boards");
const { scrapeNYCRules } = require("../lib/scrapers/nyc-rules");
const { scrapeCityGovernment } = require("../lib/scrapers/city-government");

// Minimum expected meetings per source (if scraper returns fewer, something is wrong)
const MIN_EXPECTED_MEETINGS = {
  "city-council.json": 5,
  "mta.json": 3,
  "agencies.json": 3,
  "community-boards.json": 10,
  "oversight-boards.json": 5,  // CCRB, LPC, BSA, RGB combined
  "nyc-rules.json": 1,         // Varies based on active rulemaking
  "city-government.json": 5    // CPC, Comptroller, DCAS, Borough Presidents
};

/**
 * Load existing meetings from GitHub Gist storage
 * @param {string} filename
 * @returns {Promise<{meetings: Array, lastUpdated: string|null}>}
 */
async function loadExistingMeetings(filename) {
  try {
    const data = await readFromGist(filename);
    if (data) {
      return { meetings: data.meetings || [], lastUpdated: data.lastUpdated || null };
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
 * Prepare meetings data for writing (does not write, returns data for batching)
 * @param {string} filename
 * @param {Array} newMeetings - Newly scraped meetings
 * @returns {Promise<{data: object, result: {count: number, preserved: number, reason: string|null}}>}
 */
async function prepareMeetingsData(filename, newMeetings) {
  const minExpected = MIN_EXPECTED_MEETINGS[filename] || 1;
  const existing = await loadExistingMeetings(filename);
  const existingFuture = filterFutureMeetings(existing.meetings);

  // Case 1: Scraper returned good data - merge and prepare
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

    console.log(`[${filename}] Prepared ${merged.length} meetings (${newMeetings.length} new, merged with existing)`);
    return { data, result: { count: merged.length, preserved: 0, reason: null } };
  }

  // Case 2: Scraper returned too few results but we have existing data - preserve it
  if (existingFuture.length > 0) {
    console.warn(`[${filename}] Scraper returned ${newMeetings.length} meetings (min: ${minExpected}). Preserving ${existingFuture.length} existing future meetings.`);

    const merged = mergeMeetings(existing.meetings, newMeetings);
    const data = {
      meetings: merged,
      lastUpdated: existing.lastUpdated,
      lastScraperRun: {
        timestamp: new Date().toISOString(),
        scraperFound: newMeetings.length,
        belowThreshold: true,
        preserved: existingFuture.length
      }
    };

    return { data, result: { count: merged.length, preserved: existingFuture.length, reason: "below_threshold" } };
  }

  // Case 3: Scraper returned too few and no existing data - prepare what we have
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

  return { data, result: { count: newMeetings.length, preserved: 0, reason: "no_existing_data" } };
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
 * Load existing active orgs from GitHub Gist storage
 * @returns {Promise<Array>}
 */
async function loadExistingActiveOrgs() {
  try {
    const data = await readFromGist("active-orgs.json");
    if (data) {
      return data.activeOrgs || [];
    }
  } catch (err) {
    console.error("Error loading existing active orgs:", err.message);
  }

  return [];
}

/**
 * Prepare active orgs data for writing (does not write, returns data for batching)
 * Merges with existing to prevent sudden disappearance of orgs
 * @param {Array} newActiveOrgs - Array of active org keys from current scrape
 * @returns {Promise<object>}
 */
async function prepareActiveOrgsData(newActiveOrgs) {
  const existingActiveOrgs = await loadExistingActiveOrgs();

  // Merge: keep existing orgs that aren't in new list (they might just be temporarily missing)
  const mergedOrgs = new Set([...existingActiveOrgs, ...newActiveOrgs]);

  const data = {
    activeOrgs: [...mergedOrgs].sort(),
    lastUpdated: new Date().toISOString(),
    currentRunOrgs: newActiveOrgs.length,
    totalOrgs: mergedOrgs.size
  };

  console.log(`Prepared ${mergedOrgs.size} active org keys (${newActiveOrgs.length} from current run, ${existingActiveOrgs.length} existing)`);
  return data;
}

module.exports = async function handler(req, res) {
  // Verify authorization for cron endpoint
  // Allow: Vercel cron (via special header), or manual trigger with ?secret= param

  // Vercel crons include this header automatically
  const isVercelCron = req.headers["x-vercel-cron"] === "1";

  // Manual trigger with secret query param
  const isManualTrigger = req.query.secret && req.query.secret === process.env.REFRESH_SECRET;

  if (process.env.VERCEL && !isVercelCron && !isManualTrigger) {
    res.status(401).json({
      error: "Unauthorized",
      hint: "Use ?secret=YOUR_SECRET to trigger manually"
    });
    return;
  }

  const results = {
    cityCouncil: { success: false, count: 0, error: null, meetings: [], preparedData: null },
    mta: { success: false, count: 0, error: null, meetings: [], preparedData: null },
    agencies: { success: false, count: 0, error: null, meetings: [], preparedData: null },
    communityBoards: { success: false, count: 0, error: null, meetings: [], preparedData: null },
    oversightBoards: { success: false, count: 0, error: null, meetings: [], preparedData: null },
    nycRules: { success: false, count: 0, error: null, meetings: [], preparedData: null },
    cityGovernment: { success: false, count: 0, error: null, meetings: [], preparedData: null }
  };

  // Run ALL scrapers in parallel for speed
  console.log("Starting parallel scrape of all sources...");
  const startTime = Date.now();

  const [
    cityCouncilResult,
    mtaResult,
    agenciesResult,
    manhattanResult,
    brooklynResult,
    queensResult,
    bronxResult,
    statenIslandResult,
    oversightResult,
    nycRulesResult,
    cityGovResult
  ] = await Promise.allSettled([
    scrapeCityCouncil(),
    scrapeMTA(),
    scrapeAgencies(),
    scrapeManhattanCBs(),
    scrapeBrooklynCBs(),
    scrapeQueensCBs(),
    scrapeBronxCBs(),
    scrapeStatenIslandCBs(),
    scrapeOversightBoards(),
    scrapeNYCRules(),
    scrapeCityGovernment()
  ]);

  console.log(`All scrapers completed in ${Date.now() - startTime}ms`);

  // Process City Council
  if (cityCouncilResult.status === "fulfilled") {
    const meetings = cityCouncilResult.value;
    const { data, result } = await prepareMeetingsData("city-council.json", meetings);
    results.cityCouncil = { success: true, count: meetings.length, error: null, meetings, preparedData: { data, result } };
  } else {
    console.error("City Council scraper error:", cityCouncilResult.reason?.message);
    const { data, result } = await prepareMeetingsData("city-council.json", []);
    results.cityCouncil.error = cityCouncilResult.reason?.message;
    results.cityCouncil.preparedData = { data, result };
  }

  // Process MTA
  if (mtaResult.status === "fulfilled") {
    const meetings = mtaResult.value;
    const { data, result } = await prepareMeetingsData("mta.json", meetings);
    results.mta = { success: true, count: meetings.length, error: null, meetings, preparedData: { data, result } };
  } else {
    console.error("MTA scraper error:", mtaResult.reason?.message);
    const { data, result } = await prepareMeetingsData("mta.json", []);
    results.mta.error = mtaResult.reason?.message;
    results.mta.preparedData = { data, result };
  }

  // Process Agencies
  if (agenciesResult.status === "fulfilled") {
    const meetings = agenciesResult.value;
    const { data, result } = await prepareMeetingsData("agencies.json", meetings);
    results.agencies = { success: true, count: meetings.length, error: null, meetings, preparedData: { data, result } };
  } else {
    console.error("Agencies scraper error:", agenciesResult.reason?.message);
    const { data, result } = await prepareMeetingsData("agencies.json", []);
    results.agencies.error = agenciesResult.reason?.message;
    results.agencies.preparedData = { data, result };
  }

  // Process Community Boards (combine all 5 boroughs)
  const cbResults = [manhattanResult, brooklynResult, queensResult, bronxResult, statenIslandResult];
  const allCBMeetings = [];
  const cbErrors = [];
  cbResults.forEach((r, i) => {
    const boroughs = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];
    if (r.status === "fulfilled") {
      allCBMeetings.push(...r.value);
    } else {
      cbErrors.push(`${boroughs[i]}: ${r.reason?.message}`);
    }
  });
  const { data: cbData, result: cbResult } = await prepareMeetingsData("community-boards.json", allCBMeetings);
  results.communityBoards = {
    success: cbErrors.length === 0,
    count: allCBMeetings.length,
    error: cbErrors.length > 0 ? cbErrors.join("; ") : null,
    meetings: allCBMeetings,
    preparedData: { data: cbData, result: cbResult }
  };

  // Process Oversight Boards
  if (oversightResult.status === "fulfilled") {
    const meetings = oversightResult.value;
    const { data, result } = await prepareMeetingsData("oversight-boards.json", meetings);
    results.oversightBoards = { success: true, count: meetings.length, error: null, meetings, preparedData: { data, result } };
  } else {
    console.error("Oversight Boards scraper error:", oversightResult.reason?.message);
    const { data, result } = await prepareMeetingsData("oversight-boards.json", []);
    results.oversightBoards.error = oversightResult.reason?.message;
    results.oversightBoards.preparedData = { data, result };
  }

  // Process NYC Rules
  if (nycRulesResult.status === "fulfilled") {
    const meetings = nycRulesResult.value;
    const { data, result } = await prepareMeetingsData("nyc-rules.json", meetings);
    results.nycRules = { success: true, count: meetings.length, error: null, meetings, preparedData: { data, result } };
  } else {
    console.error("NYC Rules scraper error:", nycRulesResult.reason?.message);
    const { data, result } = await prepareMeetingsData("nyc-rules.json", []);
    results.nycRules.error = nycRulesResult.reason?.message;
    results.nycRules.preparedData = { data, result };
  }

  // Process City Government
  if (cityGovResult.status === "fulfilled") {
    const meetings = cityGovResult.value;
    const { data, result } = await prepareMeetingsData("city-government.json", meetings);
    results.cityGovernment = { success: true, count: meetings.length, error: null, meetings, preparedData: { data, result } };
  } else {
    console.error("City Government scraper error:", cityGovResult.reason?.message);
    const { data, result } = await prepareMeetingsData("city-government.json", []);
    results.cityGovernment.error = cityGovResult.reason?.message;
    results.cityGovernment.preparedData = { data, result };
  }

  // Compute active orgs from all scraped meetings
  const allMeetings = [
    ...results.cityCouncil.meetings,
    ...results.mta.meetings,
    ...results.agencies.meetings,
    ...results.communityBoards.meetings,
    ...results.oversightBoards.meetings,
    ...results.nycRules.meetings,
    ...results.cityGovernment.meetings
  ];
  const activeOrgs = extractActiveOrgs(allMeetings);
  const activeOrgsData = await prepareActiveOrgsData(activeOrgs);

  // Batch write all files to GitHub Gist in a single API call
  const filesToWrite = {
    "city-council.json": prepareGistFile(results.cityCouncil.preparedData.data),
    "mta.json": prepareGistFile(results.mta.preparedData.data),
    "agencies.json": prepareGistFile(results.agencies.preparedData.data),
    "community-boards.json": prepareGistFile(results.communityBoards.preparedData.data),
    "oversight-boards.json": prepareGistFile(results.oversightBoards.preparedData.data),
    "nyc-rules.json": prepareGistFile(results.nycRules.preparedData.data),
    "city-government.json": prepareGistFile(results.cityGovernment.preparedData.data),
    "active-orgs.json": prepareGistFile(activeOrgsData)
  };

  const writeResult = await writeToGist(filesToWrite);
  if (!writeResult.success) {
    console.error("Failed to write to Gist:", writeResult.error);
  } else {
    console.log("Successfully wrote all files to Gist");
  }

  // Return results (without meetings array to keep response small)
  const totalMeetings = results.cityCouncil.count + results.mta.count + results.agencies.count +
    results.communityBoards.count + results.oversightBoards.count + results.nycRules.count +
    results.cityGovernment.count;
  const allSuccess = results.cityCouncil.success && results.mta.success && results.agencies.success &&
    results.communityBoards.success && results.oversightBoards.success && results.nycRules.success &&
    results.cityGovernment.success;

  res.status(allSuccess && writeResult.success ? 200 : 207).json({
    success: allSuccess && writeResult.success,
    timestamp: new Date().toISOString(),
    totalMeetings,
    activeOrgCount: activeOrgs.length,
    gistWriteSuccess: writeResult.success,
    gistWriteError: writeResult.error || null,
    results: {
      cityCouncil: {
        success: results.cityCouncil.success,
        count: results.cityCouncil.count,
        error: results.cityCouncil.error,
        preserved: results.cityCouncil.preparedData?.result?.preserved || 0
      },
      mta: {
        success: results.mta.success,
        count: results.mta.count,
        error: results.mta.error,
        preserved: results.mta.preparedData?.result?.preserved || 0
      },
      agencies: {
        success: results.agencies.success,
        count: results.agencies.count,
        error: results.agencies.error,
        preserved: results.agencies.preparedData?.result?.preserved || 0
      },
      communityBoards: {
        success: results.communityBoards.success,
        count: results.communityBoards.count,
        error: results.communityBoards.error,
        preserved: results.communityBoards.preparedData?.result?.preserved || 0
      },
      oversightBoards: {
        success: results.oversightBoards.success,
        count: results.oversightBoards.count,
        error: results.oversightBoards.error,
        preserved: results.oversightBoards.preparedData?.result?.preserved || 0
      },
      nycRules: {
        success: results.nycRules.success,
        count: results.nycRules.count,
        error: results.nycRules.error,
        preserved: results.nycRules.preparedData?.result?.preserved || 0
      },
      cityGovernment: {
        success: results.cityGovernment.success,
        count: results.cityGovernment.count,
        error: results.cityGovernment.error,
        preserved: results.cityGovernment.preparedData?.result?.preserved || 0
      }
    }
  });
};

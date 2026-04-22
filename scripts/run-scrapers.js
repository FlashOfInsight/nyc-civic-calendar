#!/usr/bin/env node
// Daily scraper orchestrator for NYC Civic Calendar.
// Runs all scrapers in parallel and writes results to GitHub Gist.
// Invoked by .github/workflows/scrape.yml or manually: `node scripts/run-scrapers.js`

const { readFromGist, writeToGist, prepareGistFile } = require("../lib/gist-storage");
const { scrapeCityCouncil } = require("../lib/scrapers/city-council");
const { scrapeMTA } = require("../lib/scrapers/mta");
const { scrapeAgencies } = require("../lib/scrapers/agencies");
const {
  scrapeManhattanCBs,
  scrapeBrooklynCBs,
  scrapeQueensCBs,
  scrapeBronxCBs,
  scrapeStatenIslandCBs
} = require("../lib/scrapers/community-boards");
const { scrapeOversightBoards } = require("../lib/scrapers/oversight-boards");
const { scrapeNYCRules } = require("../lib/scrapers/nyc-rules");
const { scrapeCityGovernment } = require("../lib/scrapers/city-government");
const { generateNYPDMeetings } = require("../lib/scrapers/nypd");

const MIN_EXPECTED_MEETINGS = {
  "city-council.json": 5,
  "mta.json": 3,
  "agencies.json": 3,
  "community-boards.json": 10,
  "oversight-boards.json": 5,
  "nyc-rules.json": 1,
  "city-government.json": 5,
  "nypd.json": 50
};

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

function filterFutureMeetings(meetings) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const cutoff = yesterday.toISOString().split("T")[0];
  return meetings.filter((m) => m.date >= cutoff);
}

function mergeMeetings(existingMeetings, newMeetings) {
  const meetingsById = new Map();
  for (const meeting of filterFutureMeetings(existingMeetings)) {
    meetingsById.set(meeting.id, meeting);
  }
  for (const meeting of newMeetings) {
    meetingsById.set(meeting.id, meeting);
  }
  return [...meetingsById.values()].sort((a, b) => a.date.localeCompare(b.date));
}

async function prepareMeetingsData(filename, newMeetings) {
  const minExpected = MIN_EXPECTED_MEETINGS[filename] || 1;
  const existing = await loadExistingMeetings(filename);
  const existingFuture = filterFutureMeetings(existing.meetings);

  if (newMeetings.length >= minExpected) {
    const data = {
      meetings: newMeetings.sort((a, b) => a.date.localeCompare(b.date)),
      lastUpdated: new Date().toISOString(),
      lastScraperRun: {
        timestamp: new Date().toISOString(),
        scraperFound: newMeetings.length
      }
    };
    console.log(`[${filename}] Prepared ${newMeetings.length} meetings (full replace)`);
    return { data, result: { count: newMeetings.length, preserved: 0, reason: null } };
  }

  if (existingFuture.length > 0) {
    console.warn(
      `[${filename}] Scraper returned ${newMeetings.length} meetings (min: ${minExpected}). Preserving ${existingFuture.length} existing future meetings.`
    );
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
    return {
      data,
      result: { count: merged.length, preserved: existingFuture.length, reason: "below_threshold" }
    };
  }

  console.warn(
    `[${filename}] Scraper returned ${newMeetings.length} meetings (min: ${minExpected}). No existing data to preserve.`
  );
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

function extractActiveOrgs(allMeetings) {
  const orgKeys = new Set();
  for (const meeting of allMeetings) {
    if (meeting.org) orgKeys.add(meeting.org);
  }
  return [...orgKeys].sort();
}

async function loadExistingActiveOrgs() {
  try {
    const data = await readFromGist("active-orgs.json");
    if (data) return data.activeOrgs || [];
  } catch (err) {
    console.error("Error loading existing active orgs:", err.message);
  }
  return [];
}

async function prepareActiveOrgsData(newActiveOrgs, allScrapersSucceeded) {
  if (allScrapersSucceeded) {
    const data = {
      activeOrgs: newActiveOrgs.sort(),
      lastUpdated: new Date().toISOString(),
      currentRunOrgs: newActiveOrgs.length,
      totalOrgs: newActiveOrgs.length
    };
    console.log(
      `Prepared ${newActiveOrgs.length} active org keys (full replace, all scrapers succeeded)`
    );
    return data;
  }

  const existingActiveOrgs = await loadExistingActiveOrgs();
  const mergedOrgs = new Set([...existingActiveOrgs, ...newActiveOrgs]);
  const data = {
    activeOrgs: [...mergedOrgs].sort(),
    lastUpdated: new Date().toISOString(),
    currentRunOrgs: newActiveOrgs.length,
    totalOrgs: mergedOrgs.size
  };
  console.log(
    `Prepared ${mergedOrgs.size} active org keys (merged — ${newActiveOrgs.length} current, ${existingActiveOrgs.length} existing)`
  );
  return data;
}

async function main() {
  const requiredEnv = ["GIST_ID", "GITHUB_TOKEN"];
  const missing = requiredEnv.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  const results = {
    cityCouncil: { success: false, count: 0, error: null, meetings: [], preparedData: null },
    mta: { success: false, count: 0, error: null, meetings: [], preparedData: null },
    agencies: { success: false, count: 0, error: null, meetings: [], preparedData: null },
    communityBoards: { success: false, count: 0, error: null, meetings: [], preparedData: null },
    oversightBoards: { success: false, count: 0, error: null, meetings: [], preparedData: null },
    nycRules: { success: false, count: 0, error: null, meetings: [], preparedData: null },
    cityGovernment: { success: false, count: 0, error: null, meetings: [], preparedData: null },
    nypd: { success: false, count: 0, error: null, meetings: [], preparedData: null }
  };

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

  if (cityCouncilResult.status === "fulfilled") {
    const meetings = cityCouncilResult.value;
    const { data, result } = await prepareMeetingsData("city-council.json", meetings);
    results.cityCouncil = {
      success: true,
      count: meetings.length,
      error: null,
      meetings,
      preparedData: { data, result }
    };
  } else {
    console.error("City Council scraper error:", cityCouncilResult.reason?.message);
    const { data, result } = await prepareMeetingsData("city-council.json", []);
    results.cityCouncil.error = cityCouncilResult.reason?.message;
    results.cityCouncil.preparedData = { data, result };
  }

  if (mtaResult.status === "fulfilled") {
    const meetings = mtaResult.value;
    const { data, result } = await prepareMeetingsData("mta.json", meetings);
    results.mta = {
      success: true,
      count: meetings.length,
      error: null,
      meetings,
      preparedData: { data, result }
    };
  } else {
    console.error("MTA scraper error:", mtaResult.reason?.message);
    const { data, result } = await prepareMeetingsData("mta.json", []);
    results.mta.error = mtaResult.reason?.message;
    results.mta.preparedData = { data, result };
  }

  if (agenciesResult.status === "fulfilled") {
    const meetings = agenciesResult.value;
    const { data, result } = await prepareMeetingsData("agencies.json", meetings);
    results.agencies = {
      success: true,
      count: meetings.length,
      error: null,
      meetings,
      preparedData: { data, result }
    };
  } else {
    console.error("Agencies scraper error:", agenciesResult.reason?.message);
    const { data, result } = await prepareMeetingsData("agencies.json", []);
    results.agencies.error = agenciesResult.reason?.message;
    results.agencies.preparedData = { data, result };
  }

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
  const { data: cbData, result: cbResult } = await prepareMeetingsData(
    "community-boards.json",
    allCBMeetings
  );
  results.communityBoards = {
    success: cbErrors.length === 0,
    count: allCBMeetings.length,
    error: cbErrors.length > 0 ? cbErrors.join("; ") : null,
    meetings: allCBMeetings,
    preparedData: { data: cbData, result: cbResult }
  };

  if (oversightResult.status === "fulfilled") {
    const meetings = oversightResult.value;
    const { data, result } = await prepareMeetingsData("oversight-boards.json", meetings);
    results.oversightBoards = {
      success: true,
      count: meetings.length,
      error: null,
      meetings,
      preparedData: { data, result }
    };
  } else {
    console.error("Oversight Boards scraper error:", oversightResult.reason?.message);
    const { data, result } = await prepareMeetingsData("oversight-boards.json", []);
    results.oversightBoards.error = oversightResult.reason?.message;
    results.oversightBoards.preparedData = { data, result };
  }

  if (nycRulesResult.status === "fulfilled") {
    const meetings = nycRulesResult.value;
    const { data, result } = await prepareMeetingsData("nyc-rules.json", meetings);
    results.nycRules = {
      success: true,
      count: meetings.length,
      error: null,
      meetings,
      preparedData: { data, result }
    };
  } else {
    console.error("NYC Rules scraper error:", nycRulesResult.reason?.message);
    const { data, result } = await prepareMeetingsData("nyc-rules.json", []);
    results.nycRules.error = nycRulesResult.reason?.message;
    results.nycRules.preparedData = { data, result };
  }

  if (cityGovResult.status === "fulfilled") {
    const meetings = cityGovResult.value;
    const { data, result } = await prepareMeetingsData("city-government.json", meetings);
    results.cityGovernment = {
      success: true,
      count: meetings.length,
      error: null,
      meetings,
      preparedData: { data, result }
    };
  } else {
    console.error("City Government scraper error:", cityGovResult.reason?.message);
    const { data, result } = await prepareMeetingsData("city-government.json", []);
    results.cityGovernment.error = cityGovResult.reason?.message;
    results.cityGovernment.preparedData = { data, result };
  }

  try {
    const nypdMeetings = generateNYPDMeetings();
    const { data, result } = await prepareMeetingsData("nypd.json", nypdMeetings);
    results.nypd = {
      success: true,
      count: nypdMeetings.length,
      error: null,
      meetings: nypdMeetings,
      preparedData: { data, result }
    };
  } catch (err) {
    console.error("NYPD generator error:", err.message);
    const { data, result } = await prepareMeetingsData("nypd.json", []);
    results.nypd.error = err.message;
    results.nypd.preparedData = { data, result };
  }

  const allMeetings = [
    ...results.cityCouncil.meetings,
    ...results.mta.meetings,
    ...results.agencies.meetings,
    ...results.communityBoards.meetings,
    ...results.oversightBoards.meetings,
    ...results.nycRules.meetings,
    ...results.cityGovernment.meetings,
    ...results.nypd.meetings
  ];
  const activeOrgs = extractActiveOrgs(allMeetings);
  const allScrapersSucceeded =
    results.cityCouncil.success &&
    results.mta.success &&
    results.agencies.success &&
    results.communityBoards.success &&
    results.oversightBoards.success &&
    results.nycRules.success &&
    results.cityGovernment.success &&
    results.nypd.success;
  const activeOrgsData = await prepareActiveOrgsData(activeOrgs, allScrapersSucceeded);

  const filesToWrite = {
    "city-council.json": prepareGistFile(results.cityCouncil.preparedData.data),
    "mta.json": prepareGistFile(results.mta.preparedData.data),
    "agencies.json": prepareGistFile(results.agencies.preparedData.data),
    "community-boards.json": prepareGistFile(results.communityBoards.preparedData.data),
    "oversight-boards.json": prepareGistFile(results.oversightBoards.preparedData.data),
    "nyc-rules.json": prepareGistFile(results.nycRules.preparedData.data),
    "city-government.json": prepareGistFile(results.cityGovernment.preparedData.data),
    "nypd.json": prepareGistFile(results.nypd.preparedData.data),
    "active-orgs.json": prepareGistFile(activeOrgsData)
  };

  const writeResult = await writeToGist(filesToWrite);
  if (!writeResult.success) {
    console.error("Failed to write to Gist:", writeResult.error);
  } else {
    console.log("Successfully wrote all files to Gist");
  }

  const totalMeetings =
    results.cityCouncil.count +
    results.mta.count +
    results.agencies.count +
    results.communityBoards.count +
    results.oversightBoards.count +
    results.nycRules.count +
    results.cityGovernment.count +
    results.nypd.count;

  const summary = {
    success: allScrapersSucceeded && writeResult.success,
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
      },
      nypd: {
        success: results.nypd.success,
        count: results.nypd.count,
        error: results.nypd.error,
        preserved: results.nypd.preparedData?.result?.preserved || 0
      }
    }
  };

  console.log("\n=== RUN SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));

  // Exit non-zero only if Gist write failed (data not persisted). Individual
  // scraper failures are logged but don't fail the run — the preserved-data
  // fallback keeps the calendar healthy across transient site outages.
  process.exit(writeResult.success ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

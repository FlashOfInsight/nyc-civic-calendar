#!/usr/bin/env node
// Daily scraper orchestrator for NYC Civic Calendar.
// Runs all scrapers in parallel, cleans and health-checks the results, and
// writes them to the GitHub Gist the site reads from.
// Invoked by .github/workflows/scrape.yml or manually: `node scripts/run-scrapers.js`
//
//   --dry-run   scrape and report, but write nothing to the Gist (no token needed;
//               output goes to ./scrape-output/ for inspection)

const fs = require("fs");
const path = require("path");
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
const {
  SCHEMA_VERSION,
  sanitizeMeetings,
  carryOver,
  buildHealth,
  takeNewNotices,
  todayNY
} = require("../lib/health");

const DRY_RUN = process.argv.includes("--dry-run");
const ALERT_FILE = path.join(process.cwd(), "health-alert.txt");

// Each Gist file, the scrapers that feed it, and the fewest meetings it should
// ever hold (below that we assume the scrape broke and keep the previous data).
const SOURCES = [
  { key: "cityCouncil", file: "city-council.json", min: 5, scrapers: { "City Council": scrapeCityCouncil } },
  { key: "mta", file: "mta.json", min: 3, scrapers: { "MTA": async () => scrapeMTA() } },
  { key: "agencies", file: "agencies.json", min: 3, scrapers: { "Agencies": scrapeAgencies } },
  {
    key: "communityBoards", file: "community-boards.json", min: 10,
    scrapers: {
      "Manhattan": scrapeManhattanCBs,
      "Brooklyn": scrapeBrooklynCBs,
      "Queens": scrapeQueensCBs,
      "Bronx": scrapeBronxCBs,
      "Staten Island": scrapeStatenIslandCBs
    }
  },
  { key: "oversightBoards", file: "oversight-boards.json", min: 5, scrapers: { "Oversight Boards": scrapeOversightBoards } },
  { key: "nycRules", file: "nyc-rules.json", min: 1, scrapers: { "NYC Rules": scrapeNYCRules } },
  { key: "cityGovernment", file: "city-government.json", min: 5, scrapers: { "City Government": scrapeCityGovernment } },
  { key: "nypd", file: "nypd.json", min: 50, scrapers: { "NYPD": async () => generateNYPDMeetings() } }
];

function byDate(a, b) {
  return a.date.localeCompare(b.date) || String(a.time || "").localeCompare(String(b.time || ""));
}

/** Run every scraper of a source; one failing doesn't sink the others. */
async function runSource(source) {
  const names = Object.keys(source.scrapers);
  const settled = await Promise.allSettled(names.map((n) => source.scrapers[n]()));
  const meetings = [];
  const errors = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled" && Array.isArray(r.value)) meetings.push(...r.value);
    else errors.push(`${names[i]}: ${r.reason?.message || "returned no list"}`);
  });
  for (const e of errors) console.error(`${source.key} scraper error — ${e}`);
  return { meetings, errors };
}

async function main() {
  if (!process.env.GIST_ID) {
    console.error("Missing required env var: GIST_ID");
    process.exit(1);
  }
  if (!DRY_RUN && !process.env.GITHUB_TOKEN) {
    console.error("Missing required env var: GITHUB_TOKEN (or pass --dry-run)");
    process.exit(1);
  }
  if (fs.existsSync(ALERT_FILE)) fs.unlinkSync(ALERT_FILE);

  const today = todayNY();
  console.log(`Starting parallel scrape of all sources${DRY_RUN ? " (dry run)" : ""}...`);
  const startTime = Date.now();

  const [scraped, previous, prevHealth] = await Promise.all([
    Promise.all(SOURCES.map(runSource)),
    Promise.all(SOURCES.map((s) => readFromGist(s.file))),
    readFromGist("health.json")
  ]);
  console.log(`All scrapers completed in ${Date.now() - startTime}ms`);

  const files = {};
  const finalMeetings = {};
  const summary = {};
  const fileIssues = [];
  const droppedByFile = {};

  SOURCES.forEach((source, i) => {
    const { meetings: raw, errors } = scraped[i];
    const prev = previous[i];
    const { meetings: clean, dropped } = sanitizeMeetings(raw, today);
    if (Object.keys(dropped).length) {
      droppedByFile[source.file] = dropped;
      console.log(`[${source.file}] cleanup dropped: ${JSON.stringify(dropped)}`);
    }

    let meetings;
    let preserved = 0;
    if (clean.length >= source.min) {
      const carried = carryOver(clean, prev, prevHealth, today);
      meetings = carried.meetings;
      if (carried.carriedGroups.length) {
        console.log(`[${source.file}] kept previous real data for: ${carried.carriedGroups.join(", ")}`);
      }
      console.log(`[${source.file}] Prepared ${meetings.length} meetings`);
    } else {
      // The whole source came back (nearly) empty — keep what we had
      const prevFuture = ((prev && prev.meetings) || []).filter((m) => m.date >= today);
      const merged = new Map(prevFuture.map((m) => [m.id, m]));
      for (const m of clean) merged.set(m.id, m);
      meetings = [...merged.values()];
      preserved = prevFuture.length;
      const message = `${source.file}: scraper returned ${clean.length} meetings (expected at least ${source.min})` +
        (errors.length ? ` — ${errors.join("; ").slice(0, 300)}` : "") +
        `. Kept ${preserved} previously scraped upcoming meetings.`;
      console.warn(`[${source.file}] ${message}`);
      fileIssues.push({ file: source.file, message });
    }

    meetings.sort(byDate);
    finalMeetings[source.file] = meetings;
    files[source.file] = prepareGistFile({
      schema: SCHEMA_VERSION,
      meetings,
      lastUpdated: new Date().toISOString(),
      lastScraperRun: { timestamp: new Date().toISOString(), scraperFound: clean.length, preserved }
    });
    summary[source.key] = {
      success: errors.length === 0,
      count: meetings.length,
      scraped: clean.length,
      preserved,
      error: errors.length ? errors.join("; ") : null
    };
  });

  const allMeetings = Object.values(finalMeetings).flat();
  const activeOrgs = [...new Set(allMeetings.filter((m) => m.date >= today).map((m) => m.org))].sort();
  files["active-orgs.json"] = prepareGistFile({
    activeOrgs,
    lastUpdated: new Date().toISOString(),
    totalOrgs: activeOrgs.length
  });

  const health = buildHealth(finalMeetings, prevHealth, { fileIssues, dropped: droppedByFile }, today);
  const newNotices = DRY_RUN ? [] : takeNewNotices(health);
  files["health.json"] = prepareGistFile(health);

  let writeResult = { success: true };
  if (DRY_RUN) {
    const outDir = path.join(process.cwd(), "scrape-output");
    fs.mkdirSync(outDir, { recursive: true });
    for (const [name, file] of Object.entries(files)) fs.writeFileSync(path.join(outDir, name), file.content);
    console.log(`Dry run: wrote ${Object.keys(files).length} files to ${outDir} (Gist untouched)`);
  } else {
    writeResult = await writeToGist(files);
    if (!writeResult.success) console.error("Failed to write to Gist:", writeResult.error);
    else console.log("Successfully wrote all files to Gist");
  }

  console.log("\n=== HEALTH ===");
  console.log(JSON.stringify(health.summary));
  for (const n of Object.values(health.notices)) console.log(`  • [since ${n.since}] ${n.message}`);

  // New problems go in a file the workflow emails. Only written once the Gist
  // write has succeeded, so "emailed" in health.json stays truthful.
  if (newNotices.length && writeResult.success) {
    const lines = [
      "NYC Civic Calendar found something that needs a look:",
      "",
      ...newNotices.map((n) => `- ${n.message}`),
      "",
      "Each item is reported once. The full, current report is at https://nycciviccalendar.com/api/health"
    ];
    fs.writeFileSync(ALERT_FILE, lines.join("\n"));
  }

  console.log("\n=== RUN SUMMARY ===");
  console.log(JSON.stringify({
    success: writeResult.success && Object.values(summary).every((s) => s.success),
    timestamp: new Date().toISOString(),
    totalMeetings: allMeetings.length,
    activeOrgCount: activeOrgs.length,
    gistWriteSuccess: writeResult.success,
    gistWriteError: writeResult.error || null,
    newNotices: newNotices.length,
    results: summary
  }, null, 2));

  // Exit non-zero only if the Gist write failed (data not persisted). Individual
  // scraper failures are handled above: previous data is kept and a notice raised.
  process.exit(writeResult.success ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

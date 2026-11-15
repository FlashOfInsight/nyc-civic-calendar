#!/usr/bin/env node
// Runs in the workflow after the health-notice email has been sent.
// Marks the notices listed in ./health-alert-keys.json as emailed in the
// Gist's health.json, so they aren't sent again. If the email step fails this
// script never runs, and the same notices go out with the next daily run.

const fs = require("fs");
const path = require("path");
const { readFromGist, writeToGist, prepareGistFile } = require("../lib/gist-storage");
const { markEmailed } = require("../lib/health");

async function main() {
  const keysFile = path.join(process.cwd(), "health-alert-keys.json");
  if (!fs.existsSync(keysFile)) {
    console.log("No notices to confirm.");
    return;
  }
  const keys = JSON.parse(fs.readFileSync(keysFile, "utf8"));
  const health = await readFromGist("health.json");
  if (!health) throw new Error("Could not read health.json from the Gist");

  const changed = markEmailed(health, keys);
  if (changed === 0) {
    console.log("Notices were already marked as sent.");
    return;
  }
  const result = await writeToGist({ "health.json": prepareGistFile(health) });
  if (!result.success) throw new Error(`Could not update health.json: ${result.error}`);
  console.log(`Marked ${changed} notice(s) as sent.`);
}

main().catch((err) => {
  // Not fatal for the run: the worst case is the same notice is emailed again tomorrow.
  console.error("confirm-notices:", err.message);
  process.exit(0);
});

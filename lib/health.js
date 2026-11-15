// Data-quality and health tracking for the daily scrape.
//
// Three jobs, all aimed at catching the failures that used to be silent:
//
//   1. sanitizeMeetings — one last cleanup pass over every scraper's output
//      (impossible dates, cancelled meetings, holidays, duplicates).
//   2. carryOver — when a source that had real data yesterday returns nothing
//      today (site down, layout changed), keep yesterday's real upcoming
//      meetings for a few weeks instead of dropping them or replacing them
//      with estimated dates.
//   3. buildHealth — a per-source record of whether each board/agency is
//      delivering real data, plus notices when one goes dark or when
//      hand-entered data (the MTA schedule, year-stamped URLs) is about to
//      run out. New notices are emailed by the workflow; the full report is
//      served at /api/health.

const SCHEMA_VERSION = 2;
const CARRY_OVER_DAYS = 21;   // how long to keep a silent source's last real data
const DARK_AFTER_DAYS = 35;   // a normally-live source with nothing for this long is flagged
const EXPIRY_WARN_DAYS = 30;  // warn this far ahead of hand-entered data running out

const CANCELLED_RE = /\bcancel+ed\b|^\W*cancel|\bpostponed\b|\boffice (is )?closed\b/i;
const HOLIDAY_TITLE_RE = /\b(christmas|new year'?s|martin luther king|presidents'? ?day|memorial day|independence day|labor day|thanksgiving|juneteenth|columbus day|indigenous peoples|veterans day|election day)\b/i;

function todayNY() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
}

function isRealDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || "")) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * The unit health is tracked at: one community board, one agency, the whole
 * City Council (individual committees going quiet is normal), all precincts.
 */
function groupOf(org) {
  const parts = String(org).split(".");
  if (parts[0] === "community-boards") return parts.slice(0, 3).join(".");
  if (parts[0] === "city-council") return "city-council";
  if (parts[0] === "city-agencies" && parts[1] === "nypd") return "city-agencies.nypd";
  // Rule hearings are sporadic per agency; track the NYC Rules feed as one source
  if (parts[parts.length - 1] === "rules") return "nyc-rules";
  if (parts[0] === "city-agencies" && parts[1] === "dob") return parts.slice(0, 3).join(".").replace(/industry-.*/, "industry");
  return parts.slice(0, 2).join(".");
}

// Sources that only meet part of the year; silence outside the season is expected.
const SEASONAL_GROUPS = new Set(["city-agencies.rgb"]);

function nthWeekday(year, month0, weekday, n) {
  if (n === -1) {
    const d = new Date(Date.UTC(year, month0 + 1, 0));
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - weekday + 7) % 7));
    return d.toISOString().slice(0, 10);
  }
  const first = new Date(Date.UTC(year, month0, 1));
  const day = 1 + ((weekday - first.getUTCDay() + 7) % 7) + (n - 1) * 7;
  return new Date(Date.UTC(year, month0, day)).toISOString().slice(0, 10);
}

const holidayCache = {};
/** Days a meeting generated from a "3rd Tuesday"-style pattern won't actually happen. */
function holidays(year) {
  if (holidayCache[year]) return holidayCache[year];
  const fixed = (m, d) => `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const thanksgiving = nthWeekday(year, 10, 4, 4);
  return (holidayCache[year] = new Set([
    fixed(1, 1),
    nthWeekday(year, 0, 1, 3),   // Martin Luther King Jr. Day
    nthWeekday(year, 1, 1, 3),   // Presidents' Day
    nthWeekday(year, 4, 1, -1),  // Memorial Day
    fixed(6, 19),
    fixed(7, 4),
    nthWeekday(year, 8, 1, 1),   // Labor Day
    nthWeekday(year, 9, 1, 2),   // Columbus / Indigenous Peoples' Day
    fixed(11, 11),
    thanksgiving,
    addDays(thanksgiving, 1),
    fixed(12, 24), fixed(12, 25), fixed(12, 31)
  ]));
}

/**
 * Final cleanup of scraper output. Returns the kept meetings and a tally of
 * what was dropped and why (logged, and summarised in the health report).
 */
function sanitizeMeetings(meetings, today = todayNY()) {
  const kept = [];
  const dropped = {};
  const seen = new Set();
  const drop = (reason) => { dropped[reason] = (dropped[reason] || 0) + 1; };
  const earliest = addDays(today, -35);
  const latest = addDays(today, 400);

  for (const m of meetings) {
    if (!m || !m.org || !m.title || !m.id) { drop("incomplete"); continue; }
    if (!isRealDate(m.date)) { drop("invalid-date"); continue; }
    if (m.date < earliest || m.date > latest) { drop("out-of-range"); continue; }
    if (CANCELLED_RE.test(m.title)) { drop("cancelled"); continue; }
    const isCB = m.org.startsWith("community-boards.");
    if (isCB && HOLIDAY_TITLE_RE.test(m.title) && !/committee|board|meeting/i.test(m.title)) { drop("holiday"); continue; }
    // Estimated dates come from a weekday pattern that doesn't know about holidays
    if (m.estimated && holidays(Number(m.date.slice(0, 4))).has(m.date)) { drop("estimated-on-holiday"); continue; }
    if (seen.has(m.id)) { drop("duplicate"); continue; }
    seen.add(m.id);

    if (m.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(m.time)) {
      m.time = null; // unparseable → all-day rather than a wrong hour
    }
    // No community board meets before 8 AM; "06:30" is a source that dropped the PM
    if (isCB && m.time && m.time < "08:00") {
      const [h, min] = m.time.split(":");
      m.time = `${String(Number(h) + 12).padStart(2, "0")}:${min}`;
    }
    if (m.endTime && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(m.endTime) || (m.time && m.endTime <= m.time))) {
      delete m.endTime;
    }
    kept.push(m);
  }
  return { meetings: kept, dropped };
}

/**
 * Keep the previous run's real upcoming meetings for any group that had them
 * and now has none. Only applies to data written by this version (older files
 * don't say which meetings were estimated).
 */
function carryOver(newMeetings, prevData, prevHealth, today = todayNY()) {
  if (!prevData || prevData.schema !== SCHEMA_VERSION) return { meetings: newMeetings, carriedGroups: [] };

  const prevReal = new Map();
  for (const m of prevData.meetings || []) {
    if (m.estimated || m.date < today) continue;
    const g = groupOf(m.org);
    if (!prevReal.has(g)) prevReal.set(g, []);
    prevReal.get(g).push(m);
  }
  const hasRealNow = new Set(newMeetings.filter((m) => !m.estimated).map((m) => groupOf(m.org)));

  let result = newMeetings;
  const carriedGroups = [];
  for (const [group, prevMeetings] of prevReal) {
    if (hasRealNow.has(group)) continue;
    const since = (prevHealth && prevHealth.groups && prevHealth.groups[group] && prevHealth.groups[group].missingSince) || today;
    if (daysBetween(since, today) > CARRY_OVER_DAYS) continue;
    result = result.filter((m) => groupOf(m.org) !== group);
    result.push(...prevMeetings.map((m) => ({ ...m, carried: true })));
    carriedGroups.push(group);
  }
  return { meetings: result, carriedGroups };
}

/**
 * Hand-maintained data that runs out on a known date. Each entry says what
 * to do about it, so the alert email is actionable on its own.
 */
function expiringData(today) {
  const items = [];
  try {
    const mta = require("./data/mta-schedule.json");
    let last = "0000-00-00";
    for (const [year, entries] of Object.entries(mta.schedule)) {
      for (const e of entries) {
        const d = `${year}-${String(e.month).padStart(2, "0")}-${String(e.boardDay).padStart(2, "0")}`;
        if (d > last) last = d;
      }
    }
    items.push({
      key: "mta-schedule",
      expires: last,
      message: `The MTA meeting schedule (lib/data/mta-schedule.json) has no dates after ${last}. ` +
        "mta.info blocks scrapers, so add the next dates by hand from https://www.mta.info/transparency/board-and-committee-meetings."
    });
  } catch (err) { /* schedule file missing — the MTA group will show as dark */ }

  const sources = [
    ["elections-calendar", "functions/api/elections.ics.js", /political-calendar-(20\d{2})/g, "the NYS political calendar (Elections tab)"]
  ];
  const fs = require("fs");
  const path = require("path");
  for (const [key, file, re, label] of sources) {
    try {
      const text = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
      const years = [...text.matchAll(re)].map((m) => Number(m[1]));
      if (!years.length) continue;
      const newest = Math.max(...years);
      items.push({
        key,
        expires: `${newest}-12-31`,
        message: `${label} is pinned to ${newest} in ${file}. Add the ${newest + 1} version once it is published.`
      });
    } catch (err) { /* file not present in this environment */ }
  }
  return items;
}

/**
 * Build the health report from this run's final data.
 * @param {Object<string, Array>} meetingsByFile - final meetings per Gist file
 * @param {Object|null} prevHealth - previous health.json
 * @param {Object} runInfo - { fileIssues: [{file, message}], dropped: {file: {...}} }
 */
function buildHealth(meetingsByFile, prevHealth, runInfo = {}, today = todayNY()) {
  const prevGroups = (prevHealth && prevHealth.groups) || {};
  const prevNotices = (prevHealth && prevHealth.notices) || {};
  const groups = {};

  for (const meetings of Object.values(meetingsByFile)) {
    for (const m of meetings) {
      if (m.date < today) continue;
      const g = groupOf(m.org);
      const rec = groups[g] || (groups[g] = { real: 0, estimated: 0, carried: 0 });
      if (m.carried) rec.carried++;
      else if (m.estimated) rec.estimated++;
      else rec.real++;
    }
  }
  // Groups seen before but absent today still need a record
  for (const g of Object.keys(prevGroups)) {
    if (!groups[g]) groups[g] = { real: 0, estimated: 0, carried: 0 };
  }

  for (const [g, rec] of Object.entries(groups)) {
    const prev = prevGroups[g] || {};
    if (rec.real > 0) {
      rec.lastRealAt = today;
      rec.missingSince = null;
    } else {
      rec.lastRealAt = prev.lastRealAt || null;
      rec.missingSince = rec.lastRealAt ? (prev.missingSince || today) : null;
    }
    rec.status = rec.real > 0 ? "live" : rec.carried > 0 ? "carried-over" : rec.estimated > 0 ? "estimated" : "empty";
  }

  // Notices, keyed so each is emailed once
  const notices = {};
  const note = (key, message) => {
    const prev = prevNotices[key];
    notices[key] = { message, since: prev ? prev.since : today, emailed: prev ? prev.emailed : false };
  };

  const month = Number(today.slice(5, 7));
  const summerBreak = month === 7 || month === 8 || (month === 9 && Number(today.slice(8, 10)) < 21);
  for (const [g, rec] of Object.entries(groups)) {
    if (!rec.missingSince || SEASONAL_GROUPS.has(g)) continue;
    const days = daysBetween(rec.missingSince, today);
    if (days >= DARK_AFTER_DAYS && !summerBreak) {
      note(`dark:${g}`, `${g} has had no real meeting data since ${rec.missingSince} (last seen ${rec.lastRealAt}). ` +
        `Its source may have moved or changed format${rec.estimated ? "; showing estimated dates meanwhile" : "; nothing is showing"}.`);
    }
  }

  for (const item of expiringData(today)) {
    const daysLeft = daysBetween(today, item.expires);
    if (daysLeft < 0) note(`expired:${item.key}`, `EXPIRED: ${item.message}`);
    else if (daysLeft <= EXPIRY_WARN_DAYS) note(`expiring:${item.key}`, `Runs out in ${daysLeft} days: ${item.message}`);
  }

  for (const issue of runInfo.fileIssues || []) {
    note(`file:${issue.file}`, issue.message);
  }

  const counts = { live: 0, "carried-over": 0, estimated: 0, empty: 0 };
  for (const rec of Object.values(groups)) counts[rec.status]++;

  return {
    schema: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    date: today,
    summary: counts,
    dropped: runInfo.dropped || {},
    notices,
    groups: Object.fromEntries(Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)))
  };
}

/** Notices that haven't been emailed yet; marks them emailed. */
function takeNewNotices(health) {
  const fresh = [];
  for (const [key, n] of Object.entries(health.notices)) {
    if (!n.emailed) {
      fresh.push({ key, ...n });
      n.emailed = true;
    }
  }
  return fresh;
}

module.exports = {
  SCHEMA_VERSION,
  sanitizeMeetings,
  carryOver,
  buildHealth,
  takeNewNotices,
  groupOf,
  todayNY,
  isRealDate
};

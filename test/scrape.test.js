// Run with: npm test   (Node's built-in test runner; no dependencies)
const test = require("node:test");
const assert = require("node:assert");
const { readICSEvents, expandRule, utcToNY } = require("../lib/ics-reader");
const { sanitizeMeetings, carryOver, buildHealth, takeNewNotices, groupOf } = require("../lib/health");

test("recurrence rules expand to the right dates", () => {
  assert.deepStrictEqual(expandRule("2026-01-21", { FREQ: "MONTHLY", BYDAY: "3WE" }, "2026-11-01", "2027-01-31"),
    ["2026-11-18", "2026-12-16", "2027-01-20"]);
  assert.deepStrictEqual(expandRule("2026-01-29", { FREQ: "MONTHLY", BYDAY: "-1TH", COUNT: "3" }, "2026-01-01", "2027-01-31"),
    ["2026-01-29", "2026-02-26", "2026-03-26"]);
  assert.deepStrictEqual(expandRule("2026-11-02", { FREQ: "WEEKLY", INTERVAL: "2", BYDAY: "MO,WE" }, "2026-11-15", "2026-12-05"),
    ["2026-11-16", "2026-11-18", "2026-11-30", "2026-12-02"]);
  assert.deepStrictEqual(expandRule("2026-09-08", { FREQ: "MONTHLY", BYDAY: "2TU", UNTIL: "20261209T045959Z" }, "2026-11-01", "2027-06-01"),
    ["2026-11-10", "2026-12-08"]);
});

test("UTC times convert to New York, including across midnight", () => {
  assert.deepStrictEqual(utcToNY(2026, 12, 1, 0, 30), { date: "2026-11-30", time: "19:30" });
  assert.deepStrictEqual(utcToNY(2026, 7, 1, 22, 30), { date: "2026-07-01", time: "18:30" });
});

test("feed reader honours skipped and moved occurrences", () => {
  const ics = [
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT", "UID:a", "DTSTART;TZID=America/New_York:20260914T183000", "RRULE:FREQ=MONTHLY;BYDAY=2MO",
    "EXDATE;TZID=America/New_York:20261214T183000", "SUMMARY:Land Use\\, Zoning", "END:VEVENT",
    "BEGIN:VEVENT", "UID:a", "RECURRENCE-ID;TZID=America/New_York:20270111T183000",
    "DTSTART;TZID=America/New_York:20270112T190000", "SUMMARY:Land Use (moved)", "END:VEVENT",
    "BEGIN:VEVENT", "UID:c", "DTSTART:20261203T233000Z", "STATUS:CANCELLED", "SUMMARY:Gone", "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
  const events = readICSEvents(ics, { from: "2026-11-15", to: "2027-02-28" });
  assert.deepStrictEqual(events.map((e) => `${e.date} ${e.time} ${e.summary}`),
    ["2027-01-12 19:00 Land Use (moved)", "2027-02-08 18:30 Land Use, Zoning"]);
});

const meeting = (over) => ({ id: "x1", org: "community-boards.queens.13.health", title: "CB Qn13 Health", date: "2026-12-01", time: "19:00", ...over });

test("cleanup drops impossible dates, cancellations and duplicates; fixes AM/PM slips", () => {
  const { meetings, dropped } = sanitizeMeetings([
    meeting(),
    meeting({ id: "x1" }),
    meeting({ id: "x2", date: "2026-12-00" }),
    meeting({ id: "x3", title: "CB M4 CANCELED: Chelsea Land Use" }),
    meeting({ id: "x4", time: "06:30" })
  ], "2026-11-15");
  assert.deepStrictEqual(dropped, { duplicate: 1, "invalid-date": 1, cancelled: 1 });
  assert.deepStrictEqual(meetings.map((m) => m.time), ["19:00", "18:30"]);
});

test("a source that goes quiet keeps its real data, then raises one notice", () => {
  assert.strictEqual(groupOf("community-boards.queens.13.health"), "community-boards.queens.13");
  const real = [meeting(), meeting({ id: "x5", date: "2027-01-05" })];
  const day1 = buildHealth({ f: real }, null, {}, "2026-11-15");
  assert.strictEqual(day1.groups["community-boards.queens.13"].status, "live");

  const next = carryOver([], { schema: 2, meetings: real }, day1, "2026-11-16");
  assert.deepStrictEqual(next.carriedGroups, ["community-boards.queens.13"]);
  const day2 = buildHealth({ f: next.meetings }, day1, {}, "2026-11-16");
  assert.strictEqual(day2.groups["community-boards.queens.13"].status, "carried-over");

  const later = carryOver([], { schema: 2, meetings: next.meetings }, day2, "2027-01-02");
  assert.deepStrictEqual(later.carriedGroups, []);
  const day3 = buildHealth({ f: later.meetings }, day2, {}, "2027-01-02");
  assert.ok(day3.notices["dark:community-boards.queens.13"]);
  assert.ok(takeNewNotices(day3).some((n) => n.key === "dark:community-boards.queens.13"));
  assert.strictEqual(takeNewNotices(day3).length, 0);
});

test("pattern-only sources are never carried over or flagged", () => {
  const old = [{ id: "n1", org: "city-agencies.nypd.manhattan.pct-1", title: "1st Precinct", date: "2026-12-31", time: "18:00" }];
  const day1 = buildHealth({ f: old }, null, {}, "2026-11-15");
  const fresh = [{ ...old[0], id: "n2", date: "2027-03-17", estimated: true }];
  const next = carryOver(fresh, { schema: 2, meetings: old }, day1, "2026-11-16");
  assert.deepStrictEqual(next.carriedGroups, []);
  const day2 = buildHealth({ f: next.meetings }, day1, {}, "2027-02-01");
  assert.strictEqual(day2.groups["city-agencies.nypd"].status, "estimated");
  assert.strictEqual(Object.keys(day2.notices).filter((k) => k.startsWith("dark:")).length, 0);
});

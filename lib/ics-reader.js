// Reads an iCalendar (.ics) feed — Google Calendar public feeds and the like —
// and returns the meetings that fall inside a date window, in New York
// wall-clock time.
//
// Unlike a "first DTSTART only" read, this expands recurring events (RRULE),
// honours skipped dates (EXDATE) and moved/cancelled single occurrences
// (RECURRENCE-ID overrides). Boards usually enter "Land Use, 2nd Wednesday"
// once as a recurring event, so without expansion those meetings disappear
// after their first date.
//
// No dependencies. Handles the rule shapes boards actually use:
// FREQ=DAILY|WEEKLY|MONTHLY|YEARLY with INTERVAL, BYDAY (incl. "3WE", "-1TH"),
// BYMONTHDAY, BYMONTH, UNTIL and COUNT.

const NY_TZ = "America/New_York";
const DAY_CODES = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const MAX_STEPS = 5000;

const nyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: NY_TZ,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23"
});

/** Convert a UTC instant to New York wall-clock { date: "YYYY-MM-DD", time: "HH:MM" }. */
function utcToNY(y, mo, d, h, mi) {
  const parts = {};
  for (const p of nyFormatter.formatToParts(new Date(Date.UTC(y, mo - 1, d, h, mi)))) {
    parts[p.type] = p.value;
  }
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

/** Parse a DTSTART/EXDATE/RECURRENCE-ID/UNTIL value to { date, time } (time null for all-day). */
function parseDateValue(value) {
  const m = String(value).trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, , z] = m;
  if (h === undefined) return { date: `${y}-${mo}-${d}`, time: null };
  if (z) return utcToNY(+y, +mo, +d, +h, +mi);
  // Local time with a TZID (or floating): treat as New York wall-clock.
  return { date: `${y}-${mo}-${d}`, time: `${h}:${mi}` };
}

function unescapeText(text) {
  return String(text || "")
    .replace(/\\n/gi, " ")
    .replace(/\\([,;\\])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

// Date helpers on "YYYY-MM-DD" strings, done in UTC so DST never shifts a day.
function toUTC(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function fromUTC(dt) {
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}
function addDays(dateStr, n) {
  const dt = toUTC(dateStr);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fromUTC(dt);
}
function daysInMonth(y, m0) {
  return new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
}

/** All dates in a month matching one BYDAY token ("WE", "3WE", "-1TH"). */
function datesForByDay(y, m0, token) {
  const m = token.match(/^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/);
  if (!m) return [];
  const weekday = DAY_CODES[m[2]];
  const all = [];
  for (let d = 1; d <= daysInMonth(y, m0); d++) {
    if (new Date(Date.UTC(y, m0, d)).getUTCDay() === weekday) all.push(d);
  }
  if (!m[1]) return all;
  const n = parseInt(m[1], 10);
  const pick = n > 0 ? all[n - 1] : all[all.length + n];
  return pick ? [pick] : [];
}

function parseRRule(value) {
  const rule = {};
  for (const part of value.split(";")) {
    const [k, v] = part.split("=");
    if (k && v) rule[k.toUpperCase()] = v;
  }
  return rule;
}

/**
 * Expand a recurrence rule into occurrence dates within [from, to].
 * @returns {string[]} "YYYY-MM-DD" dates
 */
function expandRule(startDate, rule, from, to) {
  const freq = rule.FREQ;
  const interval = Math.max(1, parseInt(rule.INTERVAL || "1", 10));
  const count = rule.COUNT ? parseInt(rule.COUNT, 10) : Infinity;
  const until = rule.UNTIL ? (parseDateValue(rule.UNTIL) || {}).date : null;
  const last = until && until < to ? until : to;
  const byDay = rule.BYDAY ? rule.BYDAY.split(",") : null;
  const byMonthDay = rule.BYMONTHDAY ? rule.BYMONTHDAY.split(",").map(Number) : null;
  const byMonth = rule.BYMONTH ? rule.BYMONTH.split(",").map(Number) : null;

  const start = toUTC(startDate);
  const out = [];
  let emitted = 0;
  const emit = (dateStr) => {
    if (dateStr < startDate) return true;
    if (dateStr > last) return false;
    emitted++;
    if (emitted > count) return false;
    if (dateStr >= from) out.push(dateStr);
    return true;
  };

  if (freq === "DAILY") {
    for (let i = 0, cur = startDate; i < MAX_STEPS; i++, cur = addDays(cur, interval)) {
      if (!emit(cur)) break;
    }
  } else if (freq === "WEEKLY") {
    const days = byDay
      ? byDay.map((t) => DAY_CODES[t.replace(/^[+-]?\d+/, "")]).filter((d) => d !== undefined).sort()
      : [start.getUTCDay()];
    let weekStart = addDays(startDate, -start.getUTCDay());
    outer: for (let i = 0; i < MAX_STEPS; i++, weekStart = addDays(weekStart, 7 * interval)) {
      if (weekStart > last) break;
      for (const d of days) {
        if (!emit(addDays(weekStart, d)) && (emitted > count || addDays(weekStart, d) > last)) break outer;
      }
    }
  } else if (freq === "MONTHLY" || freq === "YEARLY") {
    const stepMonths = freq === "YEARLY" ? 12 * interval : interval;
    let y = start.getUTCFullYear();
    let m0 = start.getUTCMonth();
    outer: for (let i = 0; i < MAX_STEPS; i++) {
      const months = freq === "YEARLY" && byMonth ? byMonth.map((m) => m - 1) : [m0];
      for (const month of months) {
        let dayList;
        if (byDay) {
          dayList = byDay.flatMap((t) => datesForByDay(y, month, t));
        } else if (byMonthDay) {
          const dim = daysInMonth(y, month);
          dayList = byMonthDay.map((d) => (d > 0 ? d : dim + d + 1)).filter((d) => d >= 1 && d <= dim);
        } else {
          dayList = start.getUTCDate() <= daysInMonth(y, month) ? [start.getUTCDate()] : [];
        }
        dayList = [...new Set(dayList)].sort((a, b) => a - b);
        for (const d of dayList) {
          const dateStr = `${y}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          if (!emit(dateStr) && (emitted > count || dateStr > last)) break outer;
        }
      }
      m0 += stepMonths;
      y += Math.floor(m0 / 12);
      m0 %= 12;
      if (`${y}-${String(m0 + 1).padStart(2, "0")}-01` > last) break;
    }
  }
  return out;
}

/** Split an unfolded VEVENT block into { NAME: [{ params, value }] }. */
function parseProps(block) {
  const props = {};
  for (const line of block.split("\n")) {
    const idx = line.indexOf(":");
    if (idx < 1) continue;
    const head = line.slice(0, idx);
    const name = head.split(";")[0].toUpperCase();
    (props[name] = props[name] || []).push({ params: head.slice(name.length), value: line.slice(idx + 1) });
  }
  return props;
}

/**
 * Read meetings from ICS text.
 * @param {string} icsText
 * @param {Object} window
 * @param {string} window.from - first date to include, "YYYY-MM-DD"
 * @param {string} window.to - last date to include, "YYYY-MM-DD"
 * @returns {Array<{summary: string, location: string, date: string, time: string|null, endTime: string|null}>}
 */
function readICSEvents(icsText, { from, to }) {
  const content = String(icsText).replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "");
  if (!content.includes("BEGIN:VCALENDAR")) {
    throw new Error("Not an iCalendar feed");
  }

  const blocks = content.split("BEGIN:VEVENT").slice(1).map((b) => b.split("END:VEVENT")[0]);
  const parsed = [];
  // uid → dates replaced by a RECURRENCE-ID override (the override stands in for them)
  const overridden = new Map();

  for (const block of blocks) {
    const props = parseProps(block);
    const first = (name) => (props[name] && props[name][0] ? props[name][0].value : null);
    const start = parseDateValue(first("DTSTART") || "");
    if (!start) continue;
    const end = parseDateValue(first("DTEND") || "");
    const uid = first("UID") || "";
    const recurrenceId = parseDateValue(first("RECURRENCE-ID") || "");
    if (recurrenceId) {
      if (!overridden.has(uid)) overridden.set(uid, new Set());
      overridden.get(uid).add(recurrenceId.date);
    }
    parsed.push({
      uid,
      start,
      endTime: end && end.time && end.date === start.date ? end.time : null,
      summary: unescapeText(first("SUMMARY")),
      location: unescapeText(first("LOCATION")),
      cancelled: /CANCELLED/i.test(first("STATUS") || ""),
      rrule: recurrenceId ? null : first("RRULE"),
      exdates: (props.EXDATE || [])
        .flatMap((p) => p.value.split(","))
        .map((v) => (parseDateValue(v) || {}).date)
        .filter(Boolean)
    });
  }

  const events = [];
  for (const ev of parsed) {
    if (ev.cancelled || !ev.summary) continue;
    let dates;
    if (ev.rrule) {
      const skip = new Set([...ev.exdates, ...(overridden.get(ev.uid) || [])]);
      dates = expandRule(ev.start.date, parseRRule(ev.rrule), from, to).filter((d) => !skip.has(d));
    } else {
      dates = ev.start.date >= from && ev.start.date <= to ? [ev.start.date] : [];
    }
    for (const date of dates) {
      events.push({ summary: ev.summary, location: ev.location, date, time: ev.start.time, endTime: ev.endTime });
    }
  }

  return events.sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
}

module.exports = { readICSEvents, expandRule, parseDateValue, utcToNY };

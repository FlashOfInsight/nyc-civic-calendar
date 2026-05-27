// Elections tab — 2026 NYS Political Calendar
// Calendar grid view with bitmask-based ICS selection.
// Data mirrors lib/data/political-calendar-2026.js (OTB + ind. nom. merged).

const ELECTION_EVENTS = [
  { index: 0, date: "2026-02-01", label: "Election offices certified", legalText: "Certification of offices to be filled at 2026 General Election by SBOE and CBOEs.", citation: "§§4-106(1), (2)", category: "Key Dates", election: "both", audience: "candidate" },
  { index: 1, date: "2026-02-10", label: "Party positions filing deadline", legalText: "Last day for State & County party chairs to file a statement of party positions to be filled at Primary Election.", citation: "§2-120(1)", category: "Party Nomination", election: "primary", audience: "candidate" },
  { index: 2, date: "2026-02-14", label: "Change of enrollment: deadline for immediate effect", legalText: "A change of enrollment RECEIVED by BOE not later than Feb 14 or after June 30 is effective immediately. Any change of enrollment made between Feb 15–June 30 shall be effective June 30.", citation: "§5-304(3)", category: "Change of Enrollment", election: "both", audience: "both" },
  { index: 3, date: "2026-02-20", label: "February voter enrollment list published", legalText: "List of Registered Voters: Publication of February enrollments.", citation: "§5-604", category: "Voter Registration", election: "primary", audience: "voter" },
  { index: 4, date: "2026-02-24", endDate: "2026-04-02", label: "Petition circulation period (primary)", legalText: "Dates for circulating designating petitions.", citation: "§6-134(4)", category: "Designating Petitions", election: "primary", audience: "candidate" },
  { index: 5, date: "2026-03-21", endDate: "2026-04-09", label: "OTB petition window", legalText: "First day for signing opportunity to ballot (OTB) petitions through last day to file OTB petitions.", citation: "§6-164; §6-158(4)", category: "OTB Petitions", election: "primary", audience: "candidate" },
  { index: 6, date: "2026-03-30", endDate: "2026-04-06", label: "Petition filing period (primary)", legalText: "Dates for filing designating petitions.", citation: "§6-158(1)", category: "Designating Petitions", election: "primary", audience: "candidate" },
  { index: 7, date: "2026-04-10", label: "Last day to authorize designations", legalText: "Last day to authorize designations.", citation: "§6-120(3)", category: "Designating Petitions", election: "primary", audience: "candidate" },
  { index: 8, date: "2026-04-10", label: "Last day to accept or decline designations", legalText: "Last day to accept or decline designations.", citation: "§6-158(2)", category: "Designating Petitions", election: "primary", audience: "candidate" },
  { index: 9, date: "2026-04-13", label: "Committee members: last day to receive OTB acceptance notices", legalText: "Last day for member of committee to receive notices to file acceptance.", citation: "§6-166(3)", category: "OTB Petitions", election: "primary", audience: "candidate" },
  { index: 10, date: "2026-04-14", label: "Last day to fill vacancy after designation declination", legalText: "Last day to fill a vacancy after a declination.", citation: "§6-158(3)", category: "Designating Petitions", election: "primary", audience: "candidate" },
  { index: 11, date: "2026-04-14", endDate: "2026-05-26", label: "Independent nominating petition window", legalText: "First day for signing independent nominating petitions through last day to file (May 19–26).", citation: "§6-138(4); §6-158(9)", category: "Independent Nominating Petitions", election: "general", audience: "candidate" },
  { index: 12, date: "2026-04-16", label: "Last day to file OTB petition after designated candidate declined", legalText: "Last day to file OTB petition if designated candidate has declined.", citation: "§6-158(4)", category: "OTB Petitions", election: "primary", audience: "candidate" },
  { index: 13, date: "2026-04-20", label: "Last day to file authorization of substitution (designation)", legalText: "Last day to file authorization of substitution after declination of a designation.", citation: "§6-120(3)", category: "Designating Petitions", election: "primary", audience: "candidate" },
  { index: 14, date: "2026-04-20", label: "Committee members: last day to receive acceptance notices after declination", legalText: "Last day for member of committee to receive notices to file acceptance if declination filed by a candidate.", citation: "§6-166(3)", category: "OTB Petitions", election: "primary", audience: "candidate" },
  { index: 15, date: "2026-04-29", label: "SBOE certifies primary ballot", legalText: "Certification of primary ballot by SBOE of designations filed in its office.", citation: "§4-110", category: "Certification", election: "primary", audience: "candidate" },
  { index: 16, date: "2026-04-30", label: "CBOE certifies primary ballot", legalText: "Certification of primary ballot by CBOEs of designations filed in its office.", citation: "§4-114", category: "Certification", election: "primary", audience: "candidate" },
  { index: 17, date: "2026-05-01", label: "Last day to file early voting communication plan (primary)", legalText: "Last day to file early voting communication plan with SBOE.", citation: "9 NYCRR 6211.7(c)", category: "Polling Places", election: "primary", audience: "candidate" },
  { index: 18, date: "2026-05-08", label: "Ballots transmitted to military/overseas voters (primary)", legalText: "Deadline to transmit ballots to eligible Military/Special Federal/UOCAVA Voters.", citation: "§§10-108(1), 11-204(4)", category: "Military & Federal Voters", election: "primary", audience: "voter" },
  { index: 19, date: "2026-05-09", label: "Last day to designate early voting sites (primary)", legalText: "Last day to designate early voting sites for primary elections.", citation: "§§8-600(4)(e)(i)", category: "Polling Places", election: "primary", audience: "candidate" },
  { index: 20, date: "2026-05-29", label: "Last day to accept or decline independent nomination", legalText: "Last day to accept or decline a nomination.", citation: "§6-158(11)", category: "Independent Nominating Petitions", election: "general", audience: "candidate" },
  { index: 21, date: "2026-06-01", label: "Last day to fill vacancy after independent nomination declination", legalText: "Last day to fill vacancy after a declination.", citation: "§6-158(12)", category: "Independent Nominating Petitions", election: "general", audience: "candidate" },
  { index: 22, date: "2026-06-08", label: "Change of address for primary: last day received", legalText: "Change of Address for Primary Election must be received by this date.", citation: "§5-208(3)", category: "Voter Registration", election: "primary", audience: "voter" },
  { index: 23, date: "2026-06-13", label: "Voter registration deadline (Primary)", legalText: "Voter Registration Deadline: Application must be received by this date to be eligible to vote in Primary Election.", citation: "§§5-210, 5-211, 5-212", category: "Voter Registration", election: "primary", audience: "voter" },
  { index: 24, date: "2026-06-13", label: "Last day to apply for primary ballot by mail or online", legalText: "Last day to RECEIVE application or letter of application by mail or online portal for primary ballot.", citation: "§§8-400(2)(c), 8-700(2)(c), (d)", category: "Absentee & Mail Voting", election: "primary", audience: "voter" },
  { index: 25, date: "2026-06-13", label: "Military/UOCAVA application deadline, not previously registered (primary)", legalText: "Last day for BOE to RECEIVE application for Military/Special Federal/UOCAVA ballot for primary if not previously registered.", citation: "§§10-106(5), 11-202(1)(a)", category: "Military & Federal Voters", election: "primary", audience: "voter" },
  { index: 26, date: "2026-06-13", endDate: "2026-06-21", label: "Early voting period (Primary)", legalText: "Days of Early Voting for Primary Election.", citation: "§8-600(1)", category: "Early Voting", election: "primary", audience: "voter" },
  { index: 27, date: "2026-06-16", label: "Military/UOCAVA application deadline, already registered (primary)", legalText: "Last day for BOE to RECEIVE application for Military/Special Federal/UOCAVA ballot for primary if already registered.", citation: "§§10-106(5), 11-202(1)(b)", category: "Military & Federal Voters", election: "primary", audience: "voter" },
  { index: 28, date: "2026-06-22", label: "Last day to apply in person for primary absentee ballot", legalText: "Last day to apply in person for primary ballot.", citation: "§§8-400(2)(c), 8-700(2)(c), (d)", category: "Absentee & Mail Voting", election: "primary", audience: "voter" },
  { index: 29, date: "2026-06-22", label: "Last day to apply personally for military primary ballot", legalText: "Last day to apply personally for Military ballot for primary if previously registered.", citation: "§10-106(5)", category: "Military & Federal Voters", election: "primary", audience: "voter" },
  { index: 30, date: "2026-06-23", label: "PRIMARY ELECTION DAY", legalText: "Primary Election.", citation: "§8-100(1)(a)", category: "Election Days", election: "primary", audience: "voter" },
  { index: 31, date: "2026-06-23", label: "Last day to postmark primary ballot", legalText: "Last day to postmark primary election ballot. Must be received by CBOE no later than June 30th.", citation: "§§8-412(1), 8-710", category: "Absentee & Mail Voting", election: "primary", audience: "voter" },
  { index: 32, date: "2026-06-23", label: "Last day to deliver primary ballot in person", legalText: "Last day to deliver primary ballot in person to your county board or a poll site in your county, by close of polls.", citation: "§§8-412(1), 8-710", category: "Absentee & Mail Voting", election: "primary", audience: "voter" },
  { index: 33, date: "2026-06-23", label: "Last day to postmark military/UOCAVA primary ballot", legalText: "Last day to postmark Military/Special Federal/UOCAVA ballot for primary. Must be received by BOE no later than June 30th.", citation: "§§10-114(1), 11-212", category: "Military & Federal Voters", election: "primary", audience: "voter" },
  { index: 34, date: "2026-06-26", label: "Last day to decline independent nomination after losing primary", legalText: "Last day to decline after acceptance if nominee loses party primary.", citation: "§6-158(11)", category: "Independent Nominating Petitions", election: "general", audience: "candidate" },
  { index: 35, date: "2026-07-03", label: "Last day to decline party nominations after primary loss", legalText: "Last day to decline all party nominations after primary loss.", citation: "§6-146(6)", category: "Party Nomination", election: "primary", audience: "candidate" },
  { index: 36, date: "2026-07-06", label: "Canvass of primary election returns", legalText: "Canvass of Primary Election returns by CBOEs.", citation: "§9-200(1)", category: "Canvass & Results", election: "primary", audience: "candidate" },
  { index: 37, date: "2026-07-06", label: "Verifiable audit of voting systems (primary)", legalText: "Verifiable Audit of Voting Systems.", citation: "§9-211(1)", category: "Canvass & Results", election: "primary", audience: "candidate" },
  { index: 38, date: "2026-07-07", label: "Last day to fill vacancy after primary loser declination", legalText: "Last day to fill vacancy after declination by primary loser.", citation: "§6-158(3)", category: "Party Nomination", election: "primary", audience: "candidate" },
  { index: 39, date: "2026-07-13", label: "Last day to file authorization of substitution (primary loser)", legalText: "Last day to file authorization of substitution after declination by primary loser.", citation: "§6-120(3)", category: "Party Nomination", election: "primary", audience: "candidate" },
  { index: 40, date: "2026-07-13", label: "Recanvass of primary returns", legalText: "Recanvass of Primary returns.", citation: "§9-208(1)", category: "Canvass & Results", election: "primary", audience: "candidate" },
  { index: 41, date: "2026-07-23", label: "Last day to file nominations from caucus or party committee", legalText: "Last day for filing nominations from town or village caucus or party committee.", citation: "§6-158(6)", category: "Party Nomination", election: "primary", audience: "candidate" },
  { index: 42, date: "2026-07-23", label: "Last day to file certificates of nomination to fill vacancies", legalText: "Last day to file certificates of nomination to fill vacancies created pursuant to §§6-116, 6-104.", citation: "§6-158(6)", category: "Party Nomination", election: "primary", audience: "candidate" },
  { index: 43, date: "2026-07-27", label: "Last day to accept or decline §6-116 nomination", legalText: "Last day to accept or decline a nomination for office made based on §6-116.", citation: "§6-158(7)", category: "Party Nomination", election: "primary", audience: "candidate" },
  { index: 44, date: "2026-07-27", label: "Last day to file authorization of §6-116 nomination", legalText: "Last day to file authorization of nomination made based on §6-116.", citation: "§6-120(3)", category: "Party Nomination", election: "primary", audience: "candidate" },
  { index: 45, date: "2026-07-31", label: "Last day to fill vacancy after §6-116 declination", legalText: "Last day to fill a vacancy after a declination made based on §6-116.", citation: "§6-158(8)", category: "Party Nomination", election: "primary", audience: "candidate" },
  { index: 46, date: "2026-08-03", label: "Deadline: vacancies authorized to be filled at General Election", legalText: "A vacancy occurring three (3) months before a General Election in any year in any office are authorized to be filled at a General Election.", citation: "§6-158(14)", category: "Key Dates", election: "general", audience: "candidate" },
  { index: 47, date: "2026-08-03", label: "Deadline: referendum/proposition text due to CBOE", legalText: "For any election conducted by a CBOE, the clerk of such subdivision shall provide the CBOE with a certified text copy of any referendum, proposition, or proposal at least three (3) months before the General Election.", citation: "§4-108(b)", category: "Key Dates", election: "general", audience: "candidate" },
  { index: 48, date: "2026-08-06", endDate: "2026-08-12", label: "Judicial District Conventions", legalText: "Dates for holding Judicial conventions. Minutes of a convention must be filed within 72 hours (3 days) of adjournment.", citation: "§6-158(5)", category: "Judicial Conventions", election: "general", audience: "candidate" },
  { index: 49, date: "2026-08-13", label: "Last day to file judicial nomination certificates", legalText: "Last day to file certificates of nominations.", citation: "§6-158(6)", category: "Judicial Conventions", election: "general", audience: "candidate" },
  { index: 50, date: "2026-08-17", label: "Last day to decline judicial nomination", legalText: "Last day to decline nomination.", citation: "§6-158(7)", category: "Judicial Conventions", election: "general", audience: "candidate" },
  { index: 51, date: "2026-08-21", label: "Last day to fill vacancy after judicial nomination declination", legalText: "Last day to fill vacancy after a declination.", citation: "§6-158(8)", category: "Judicial Conventions", election: "general", audience: "candidate" },
  { index: 52, date: "2026-09-09", label: "SBOE certifies General Election ballot", legalText: "Certification of General Election ballot by SBOE of nominations filed in its office.", citation: "§4-112(1)", category: "Certification", election: "general", audience: "candidate" },
  { index: 53, date: "2026-09-10", label: "CBOE certifies General Election ballot", legalText: "Certification of General Election ballot by CBOE of nominations and questions.", citation: "§4-114", category: "Certification", election: "general", audience: "candidate" },
  { index: 54, date: "2026-09-18", label: "Ballots transmitted to military/overseas voters (general)", legalText: "Deadline to transmit ballots to eligible Military/Special Federal/UOCAVA voters.", citation: "§§10-108(1), 11-204(4)", category: "Military & Federal Voters", election: "general", audience: "voter" },
  { index: 55, date: "2026-10-19", label: "Change of address for General Election: last day received", legalText: "Change of Address for General Election: received by BOE by this date must be processed.", citation: "§5-208(3)", category: "Voter Registration", election: "general", audience: "voter" },
  { index: 56, date: "2026-10-24", label: "Voter registration deadline (General)", legalText: "Registration Deadline for General Election: Last day application must be received by BOE to be eligible to vote in General Election.", citation: "§§5-210, 5-211, 5-212", category: "Voter Registration", election: "general", audience: "voter" },
  { index: 57, date: "2026-10-24", label: "Last day to apply for general ballot by mail or online", legalText: "Last day for board of elections to RECEIVE application or letter of application by mail or online portal for General Election ballot.", citation: "§§8-400(2)(c), 8-700(2)(c), (d)", category: "Absentee & Mail Voting", election: "general", audience: "voter" },
  { index: 58, date: "2026-10-24", label: "Military/UOCAVA application deadline, not previously registered (general)", legalText: "Last day for BOE to RECEIVE application for Military/Special Federal/UOCAVA ballot for general if not previously registered.", citation: "§§10-106(5), 11-202(1)(a)", category: "Military & Federal Voters", election: "general", audience: "voter" },
  { index: 59, date: "2026-10-24", endDate: "2026-11-01", label: "Early voting period (General)", legalText: "Days of Early Voting for the General Election.", citation: "§8-600(1)", category: "Early Voting", election: "general", audience: "voter" },
  { index: 60, date: "2026-10-27", label: "Military/UOCAVA application deadline, already registered (general)", legalText: "Last day for BOE to RECEIVE application for Military/Special Federal/UOCAVA ballot for general if already registered.", citation: "§§10-106(5), 11-202(1)(b)", category: "Military & Federal Voters", election: "general", audience: "voter" },
  { index: 61, date: "2026-11-02", label: "Last day to apply in person for general absentee ballot", legalText: "Last day to apply in person for General Election ballot.", citation: "§§8-400(2)(c), 8-700(2)(c), (d)", category: "Absentee & Mail Voting", election: "general", audience: "voter" },
  { index: 62, date: "2026-11-02", label: "Last day to apply personally for military general ballot", legalText: "Last day to apply personally for Military ballot for general if previously registered.", citation: "§10-106(5)", category: "Military & Federal Voters", election: "general", audience: "voter" },
  { index: 63, date: "2026-11-03", label: "GENERAL ELECTION DAY", legalText: "General Election.", citation: "§8-100(1)(c)", category: "Election Days", election: "general", audience: "voter" },
  { index: 64, date: "2026-11-03", label: "Last day to postmark general ballot", legalText: "Last day to postmark General Election ballot. Must be received by CBOE no later than Nov 10th.", citation: "§§8-412(1), 8-710", category: "Absentee & Mail Voting", election: "general", audience: "voter" },
  { index: 65, date: "2026-11-03", label: "Last day to deliver general ballot in person", legalText: "Last day to deliver General Election ballot in person to CBOE or poll site within county by close of polls on Election Day.", citation: "§§8-412(1), 8-710", category: "Absentee & Mail Voting", election: "general", audience: "voter" },
  { index: 66, date: "2026-11-03", label: "Last day to postmark military/UOCAVA general ballot", legalText: "Last day to postmark Military/Special Federal/UOCAVA ballot for general. Must be received by BOE no later than Nov 16th.", citation: "§§10-114(1), 11-212", category: "Military & Federal Voters", election: "general", audience: "voter" },
  { index: 67, date: "2026-11-18", label: "Recanvass of General Election returns", legalText: "Recanvass of General Election returns.", citation: "§9-208(1)", category: "Canvass & Results", election: "general", audience: "candidate" },
  { index: 68, date: "2026-11-18", label: "Verifiable audit of voting systems (general)", legalText: "Verifiable Audit of Voting Systems.", citation: "§9-211(1)", category: "Canvass & Results", election: "general", audience: "candidate" },
  { index: 69, date: "2026-11-28", label: "Certification and transmission of General Election canvass", legalText: "Certification and transmission of Canvass of General Election returns by CBOEs.", citation: "§9-214(1)", category: "Canvass & Results", election: "general", audience: "candidate" },
  { index: 70, date: "2026-12-15", label: "State Board of Canvassers certifies General Election", legalText: "Last day for State Board of Canvassers to meet to certify General Election.", citation: "§9-216(2)", category: "Canvass & Results", election: "general", audience: "candidate" }
];

// ── State ─────────────────────────────────────────────────────

let selectedElectionEvents = new Set();
let audienceFilter = "all";
let electionFilter = "all";
const LS_KEY = "nyc-civic-elections-2026";

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

// ── Bitmask ───────────────────────────────────────────────────

function encodeBitmask(indices) {
  if (indices.size === 0) return "";
  let n = 0n;
  for (const idx of indices) n |= (1n << BigInt(idx));
  const byteLen = Math.ceil((Math.max(...indices) + 1) / 8);
  const bytes = new Uint8Array(byteLen);
  for (let i = 0; i < byteLen; i++) bytes[i] = Number((n >> BigInt(i * 8)) & 0xffn);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBitmask(encoded) {
  const result = new Set();
  if (!encoded) return result;
  try {
    const pad = (4 - (encoded.length % 4)) % 4;
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
    const binary = atob(b64);
    for (let i = 0; i < binary.length; i++) {
      const byte = binary.charCodeAt(i);
      for (let bit = 0; bit < 8; bit++) {
        if (byte & (1 << bit)) {
          const idx = i * 8 + bit;
          if (idx < ELECTION_EVENTS.length) result.add(idx);
        }
      }
    }
  } catch {}
  return result;
}

// ── Persistence ───────────────────────────────────────────────

function saveElectionSelections() {
  localStorage.setItem(LS_KEY, encodeBitmask(selectedElectionEvents));
}

function loadElectionSelections() {
  selectedElectionEvents = decodeBitmask(localStorage.getItem(LS_KEY));
}

// ── Date utilities ────────────────────────────────────────────

function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toDateStr(dt) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr, n) {
  const dt = parseDate(dateStr);
  dt.setDate(dt.getDate() + n);
  return toDateStr(dt);
}

function dowOf(dateStr) {
  return parseDate(dateStr).getDay(); // 0=Sun
}

function startOfWeek(dateStr) {
  const dt = parseDate(dateStr);
  dt.setDate(dt.getDate() - dt.getDay());
  return toDateStr(dt);
}

function formatDateDisplay(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]} ${d}, ${y}`;
}

function formatRangeDisplay(start, end) {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  if (sm === em) return `${MONTHS_SHORT[sm - 1]} ${sd}–${ed}, ${sy}`;
  return `${MONTHS_SHORT[sm - 1]} ${sd} – ${MONTHS_SHORT[em - 1]} ${ed}, ${sy}`;
}

// ── Visibility ────────────────────────────────────────────────

function isVisible(event) {
  const aud = audienceFilter === "all" || event.audience === audienceFilter || event.audience === "both";
  const elec = electionFilter === "all" || event.election === electionFilter || event.election === "both";
  return aud && elec;
}

// ── Calendar computation ──────────────────────────────────────

function getWeekData(weekStart) {
  const weekEnd = addDays(weekStart, 6);
  const multidaySegs = [];
  const dayEvents = [[], [], [], [], [], [], []];

  for (const event of ELECTION_EVENTS) {
    if (!isVisible(event)) continue;
    const isRange = !!event.endDate;
    const eventEnd = event.endDate || event.date;

    if (isRange) {
      if (eventEnd < weekStart || event.date > weekEnd) continue;
      const startCol = event.date <= weekStart ? 0 : dowOf(event.date);
      const endCol = eventEnd >= weekEnd ? 6 : dowOf(eventEnd);
      const continuesLeft = event.date < weekStart;
      const continuesRight = eventEnd > weekEnd;
      const isFirstSeg = event.date >= weekStart && event.date <= weekEnd;
      multidaySegs.push({ event, startCol, endCol, continuesLeft, continuesRight, isFirstSeg, trackIndex: 0 });
    } else {
      if (event.date < weekStart || event.date > weekEnd) continue;
      dayEvents[dowOf(event.date)].push(event);
    }
  }

  // Assign tracks (vertical stacking rows) for overlapping multi-day bars
  const sorted = [...multidaySegs].sort((a, b) => a.startCol - b.startCol);
  const trackEnds = []; // endCol of last segment assigned to each track
  for (const seg of sorted) {
    let placed = false;
    for (let t = 0; t < trackEnds.length; t++) {
      if (trackEnds[t] < seg.startCol) {
        seg.trackIndex = t;
        trackEnds[t] = seg.endCol;
        placed = true;
        break;
      }
    }
    if (!placed) {
      seg.trackIndex = trackEnds.length;
      trackEnds.push(seg.endCol);
    }
  }

  return { multidaySegs, dayEvents, trackCount: trackEnds.length };
}

// ── DOM helpers ───────────────────────────────────────────────

function eventAudienceClass(event) {
  return event.audience === "candidate" ? "cal-candidate" : "cal-voter";
}

function createEventBar(seg, today) {
  const { event, startCol, endCol, continuesLeft, continuesRight, isFirstSeg, trackIndex } = seg;
  const el = document.createElement("div");
  el.className = `cal-event-bar ${eventAudienceClass(event)}${selectedElectionEvents.has(event.index) ? " cal-selected" : ""}${event.date < today ? " cal-past" : ""}`;
  el.style.gridColumn = `${startCol + 1} / ${endCol + 2}`;
  el.style.gridRow = `${trackIndex + 1}`;
  el.dataset.index = event.index;

  const left = continuesLeft ? "← " : "";
  const right = continuesRight ? " →" : "";
  const label = isFirstSeg ? event.label : "";
  el.textContent = left + label + right;

  return el;
}

function createEventChip(event, today) {
  const el = document.createElement("button");
  el.className = `cal-event-chip ${eventAudienceClass(event)}${selectedElectionEvents.has(event.index) ? " cal-selected" : ""}${event.date < today ? " cal-past" : ""}`;
  el.dataset.index = event.index;
  el.textContent = event.label;
  el.type = "button";
  return el;
}

// ── Tooltip ───────────────────────────────────────────────────

let tooltipTimeout = null;

function showTooltip(event, anchorEl) {
  clearTimeout(tooltipTimeout);
  const tt = document.getElementById("cal-tooltip");
  const dateStr = event.endDate
    ? formatRangeDisplay(event.date, event.endDate)
    : formatDateDisplay(event.date);

  tt.querySelector(".cal-tt-label").textContent = event.label;
  tt.querySelector(".cal-tt-date").textContent = dateStr;
  tt.querySelector(".cal-tt-legal").textContent = `${event.legalText} ${event.citation}`;
  tt.querySelector(".cal-tt-category").textContent = `${event.category} · ${event.election === "both" ? "Primary & General" : event.election === "primary" ? "Primary" : "General"} · ${event.audience === "both" ? "Voter & Candidate" : event.audience}`;
  tt.querySelector(".cal-tt-hint").textContent = selectedElectionEvents.has(event.index)
    ? "Click to remove from your calendar"
    : "Click to add to your calendar";

  tt.hidden = false;

  const rect = anchorEl.getBoundingClientRect();
  const ttRect = tt.getBoundingClientRect();
  let top = rect.bottom + window.scrollY + 6;
  let left = rect.left + window.scrollX;
  // Keep tooltip within viewport
  if (left + 280 > window.innerWidth) left = window.innerWidth - 288;
  if (left < 8) left = 8;
  tt.style.top = `${top}px`;
  tt.style.left = `${left}px`;
}

function hideTooltip() {
  tooltipTimeout = setTimeout(() => {
    const tt = document.getElementById("cal-tooltip");
    if (tt) tt.hidden = true;
  }, 120);
}

// ── Calendar render ───────────────────────────────────────────

function computeMaxDayEvents(minDate, maxDate) {
  let max = 0;
  let w = startOfWeek(minDate);
  const lastWeek = startOfWeek(maxDate);
  while (w <= lastWeek) {
    const { dayEvents } = getWeekData(w);
    for (let col = 0; col < 7; col++) {
      if (dayEvents[col].length > max) max = dayEvents[col].length;
    }
    w = addDays(w, 7);
  }
  return max;
}

function renderCalendar() {
  const container = document.getElementById("cal-container");
  container.innerHTML = "";

  const today = toDateStr(new Date());
  const currentWeekStart = startOfWeek(today);

  // Find first and last event dates
  let minDate = ELECTION_EVENTS[0].date;
  let maxDate = ELECTION_EVENTS[0].endDate || ELECTION_EVENTS[0].date;
  for (const e of ELECTION_EVENTS) {
    if (e.date < minDate) minDate = e.date;
    const end = e.endDate || e.date;
    if (end > maxDate) maxDate = end;
  }

  // Uniform chip-body height: sized to busiest visible day (date-num row is separate)
  const maxChips = computeMaxDayEvents(minDate, maxDate);
  // chip: ~17px (0.55rem * 1.45 + 4px padding); gap: 2px; padding: 6px
  const dayH = Math.max(44, 6 + maxChips * 17 + Math.max(0, maxChips - 1) * 2);
  container.style.setProperty("--cal-day-height", `${dayH}px`);

  // Column headers (with matching left spacer for month-label column)
  const headerWrapper = document.createElement("div");
  headerWrapper.className = "cal-col-headers-wrapper";
  const headerSpacer = document.createElement("div");
  headerSpacer.className = "cal-month-label";
  headerWrapper.appendChild(headerSpacer);
  const headerRow = document.createElement("div");
  headerRow.className = "cal-col-headers";
  DAYS.forEach(d => {
    const cell = document.createElement("div");
    cell.className = "cal-col-header";
    cell.textContent = d;
    headerRow.appendChild(cell);
  });
  headerWrapper.appendChild(headerRow);
  container.appendChild(headerWrapper);

  // Collect week starts
  const allWeeks = [];
  let w = startOfWeek(minDate);
  const lastWeek = startOfWeek(maxDate);
  while (w <= lastWeek) {
    allWeeks.push(w);
    w = addDays(w, 7);
  }

  const pastWeeks = allWeeks.filter(ws => ws < currentWeekStart);
  const futureWeeks = allWeeks.filter(ws => ws >= currentWeekStart);

  // Past section
  if (pastWeeks.length > 0) {
    const pastBtn = document.createElement("button");
    pastBtn.className = "show-past-btn bulk-btn";
    pastBtn.id = "show-past-btn";
    pastBtn.textContent = `Show past dates (${pastWeeks.length} weeks)`;

    const pastContainer = document.createElement("div");
    pastContainer.id = "past-weeks";
    pastContainer.hidden = true;
    pastWeeks.forEach((ws, i) => {
      const prevMonth = i > 0 ? parseDate(pastWeeks[i - 1]).getMonth() : -1;
      pastContainer.appendChild(renderWeek(ws, today, prevMonth));
    });

    pastBtn.addEventListener("click", () => {
      const hidden = pastContainer.hidden;
      pastContainer.hidden = !hidden;
      pastBtn.textContent = hidden
        ? "Hide past dates"
        : `Show past dates (${pastWeeks.length} weeks)`;
    });

    container.appendChild(pastBtn);
    container.appendChild(pastContainer);
  }

  // Future/current weeks
  const futureContainer = document.createElement("div");
  futureContainer.id = "future-weeks";
  futureWeeks.forEach((ws, i) => {
    const prevMonth = i > 0
      ? parseDate(futureWeeks[i - 1]).getMonth()
      : pastWeeks.length > 0
        ? parseDate(pastWeeks[pastWeeks.length - 1]).getMonth()
        : -1;
    futureContainer.appendChild(renderWeek(ws, today, prevMonth));
  });
  container.appendChild(futureContainer);

  // Wire up event interactions
  container.addEventListener("mouseover", e => {
    const el = e.target.closest("[data-index]");
    if (!el) return;
    const event = ELECTION_EVENTS[Number(el.dataset.index)];
    if (event) showTooltip(event, el);
  });
  container.addEventListener("mouseout", e => {
    if (!e.target.closest("[data-index]")) return;
    hideTooltip();
  });
  container.addEventListener("click", e => {
    const el = e.target.closest("[data-index]");
    if (!el) return;
    const idx = Number(el.dataset.index);
    if (selectedElectionEvents.has(idx)) {
      selectedElectionEvents.delete(idx);
    } else {
      selectedElectionEvents.add(idx);
    }
    saveElectionSelections();
    updateElectionsUrl();
    // Update all elements with this index
    container.querySelectorAll(`[data-index="${idx}"]`).forEach(node => {
      node.classList.toggle("cal-selected", selectedElectionEvents.has(idx));
    });
    // Update tooltip hint if visible
    const tt = document.getElementById("cal-tooltip");
    if (tt && !tt.hidden) {
      tt.querySelector(".cal-tt-hint").textContent = selectedElectionEvents.has(idx)
        ? "Click to remove from your calendar"
        : "Click to add to your calendar";
    }
  });
}

function renderWeek(weekStart, today, prevMonth) {
  const weekEnd = addDays(weekStart, 6);
  const { multidaySegs, dayEvents, trackCount } = getWeekData(weekStart);

  const wrapEl = document.createElement("div");
  wrapEl.className = "cal-week-wrapper";

  // Vertical month label on the left — text only on month transitions
  const weekMonth = parseDate(weekStart).getMonth();
  const weekYear = parseDate(weekStart).getFullYear();
  const monthLabel = document.createElement("div");
  monthLabel.className = "cal-month-label";
  if (weekMonth !== prevMonth) {
    monthLabel.textContent = MONTHS_LONG[weekMonth];
    monthLabel.classList.add("cal-month-label--active");
  }
  wrapEl.appendChild(monthLabel);

  const weekEl = document.createElement("div");
  weekEl.className = "cal-week";
  weekEl.dataset.weekStart = weekStart;

  // Row 1: date number cells
  for (let col = 0; col < 7; col++) {
    const dateStr = addDays(weekStart, col);
    const [, m, d] = dateStr.split("-").map(Number);
    const topEl = document.createElement("div");
    topEl.className = "cal-day-top" +
      (dateStr === today ? " cal-day--today" : "") +
      (dateStr < today ? " cal-day--past" : "") +
      (col === 6 ? " cal-day--last" : "");
    const numEl = document.createElement("span");
    numEl.className = "cal-day-num";
    if (dateStr === today) {
      numEl.textContent = "TODAY";
    } else if (d === 1) {
      numEl.textContent = `${MONTHS_SHORT[m - 1]} 1`;
    } else {
      numEl.textContent = String(d);
    }
    topEl.appendChild(numEl);
    weekEl.appendChild(topEl);
  }

  // Row 2: multi-day bars spanning all 7 columns
  if (multidaySegs.length > 0) {
    const tracks = document.createElement("div");
    tracks.className = "cal-multiday-tracks";
    tracks.style.gridTemplateRows = `repeat(${trackCount}, 22px)`;
    for (const seg of multidaySegs) {
      tracks.appendChild(createEventBar(seg, today));
    }
    weekEl.appendChild(tracks);
  }

  // Row 3: chip body cells
  for (let col = 0; col < 7; col++) {
    const dateStr = addDays(weekStart, col);
    const bodyEl = document.createElement("div");
    bodyEl.className = "cal-day-body" +
      (dateStr < today ? " cal-day--past" : "") +
      (col === 6 ? " cal-day--last" : "");
    for (const event of dayEvents[col]) {
      bodyEl.appendChild(createEventChip(event, today));
    }
    weekEl.appendChild(bodyEl);
  }

  wrapEl.appendChild(weekEl);
  return wrapEl;
}

// ── ICS URL ───────────────────────────────────────────────────

function updateElectionsUrl() {
  const section = document.getElementById("elections-calendar-section");
  const input = document.getElementById("elections-calendar-url");
  if (selectedElectionEvents.size === 0) {
    section.style.display = "none";
    return;
  }
  section.style.display = "block";
  input.value = `${window.location.origin}/api/elections.ics?e=${encodeBitmask(selectedElectionEvents)}`;
}

function copyElectionsUrl() {
  const input = document.getElementById("elections-calendar-url");
  const btn = document.getElementById("elections-copy-btn");
  navigator.clipboard.writeText(input.value).then(() => {
    btn.textContent = "Copied!";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("copied"); }, 2000);
  });
}

// ── Bulk selection ────────────────────────────────────────────

function selectAllVisible() {
  ELECTION_EVENTS.forEach(e => { if (isVisible(e)) selectedElectionEvents.add(e.index); });
  saveElectionSelections();
  updateElectionsUrl();
  renderCalendar();
}

function clearAllVisible() {
  ELECTION_EVENTS.forEach(e => { if (isVisible(e)) selectedElectionEvents.delete(e.index); });
  saveElectionSelections();
  updateElectionsUrl();
  renderCalendar();
}

// ── Tabs ──────────────────────────────────────────────────────

function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
      document.getElementById("tab-meetings").hidden = tab !== "meetings";
      document.getElementById("tab-elections").hidden = tab !== "elections";
    });
  });
}

// ── Filter toggles ────────────────────────────────────────────

function initFilters() {
  document.querySelectorAll(".audience-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      audienceFilter = btn.dataset.audience;
      document.querySelectorAll(".audience-btn").forEach(b => b.classList.toggle("active", b.dataset.audience === audienceFilter));
      renderCalendar();
    });
  });

  document.querySelectorAll(".election-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      electionFilter = btn.dataset.election;
      document.querySelectorAll(".election-btn").forEach(b => b.classList.toggle("active", b.dataset.election === electionFilter));
      renderCalendar();
    });
  });

  document.getElementById("elect-select-all").addEventListener("click", selectAllVisible);
  document.getElementById("elect-clear-all").addEventListener("click", clearAllVisible);
  document.getElementById("elections-copy-btn").addEventListener("click", copyElectionsUrl);
}

// ── Init ──────────────────────────────────────────────────────

function initElections() {
  loadElectionSelections();
  renderCalendar();
  updateElectionsUrl();
  initTabs();
  initFilters();
}

document.addEventListener("DOMContentLoaded", initElections);

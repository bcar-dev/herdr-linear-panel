// What the list shows: which issues are asked for, how they are grouped and ordered, and what a group adds up to.
// Pure rules with no calls to Herdr, so node can test them (tests/unit).

// State types in the order their groups are listed: work in progress first, finished work last.
const GROUP_ORDER = ["started", "unstarted", "backlog", "triage", "completed", "canceled", "duplicate"];

export const FINISHED = ["completed", "canceled", "duplicate"];
/** @param {Issue} issue */
export const isFinished = (issue) => FINISHED.includes(issue.state.type);

// The mod runtime's localeCompare compares code units (no ICU, options ignored), so the tracker's order is spelled out.
/** @param {string} ch */
const rank = (ch) => (/\s/u.test(ch) ? 0 : /\p{L}/u.test(ch) ? 3 : /\p{N}/u.test(ch) ? 2 : 1);

// Titles in the tracker's own order: case ignored; spaces, then punctuation, then digits, then letters.
/**
 * @param {string} a
 * @param {string} b
 */
export function byTitle(a, b) {
  const x = a.toLowerCase(), y = b.toLowerCase();
  for (let i = 0; i < x.length && i < y.length; i++) {
    if (x[i] !== y[i]) return rank(x[i]) - rank(y[i]) || (x[i] < y[i] ? -1 : 1);
  }
  return x.length - y.length;
}

// BACK-9 before BACK-100: by team key, then by number.
/**
 * @param {Issue} a
 * @param {Issue} b
 */
function byIdentifier(a, b) {
  const [keyA, numberA] = a.identifier.split("-"), [keyB, numberB] = b.identifier.split("-");
  return (keyA < keyB ? -1 : keyA > keyB ? 1 : 0) || Number(numberA) - Number(numberB);
}

/** @param {Issue} issue */
const urgency = (issue) => issue.priority || 5; // 0 is "no priority": last.
/** @type {Record<string, (a: Issue, b: Issue) => number>} */
const WITHIN_GROUP = {
  priority: (a, b) => urgency(a) - urgency(b) || byIdentifier(a, b),
  title: (a, b) => byTitle(a.title, b.title) || byIdentifier(a, b),
};

/** @param {Issue} issue */
const finishedAt = (issue) => issue.completedAt ?? issue.canceledAt ?? "";
// Most recently finished first. ISO dates compare as text.
/**
 * @param {Issue} a
 * @param {Issue} b
 */
const byRecency = (a, b) => (finishedAt(a) < finishedAt(b) ? 1 : finishedAt(a) > finishedAt(b) ? -1 : 0) ||
  byIdentifier(a, b);

const DAY = 86_400_000;
const PAST = { day: DAY, week: 7 * DAY, month: 30 * DAY };
const UNFINISHED = { state: { type: { nin: FINISHED } } };
const IN_ACTIVE_CYCLE = { cycle: { isActive: { eq: true } } };

// The "Completed issues" option as an API filter on finished issues: "all", "day", "week", "month" (finished since
// then), "cycle" (those of the active cycle) or "none". Unfinished issues always pass. Null lets every issue through.
/**
 * @param {Display["completed"]} completed
 * @param {number} now
 */
function completedFilter(completed, now) {
  if (completed === "all") return null;
  if (completed === "none") return UNFINISHED;
  if (completed === "cycle") return { or: [UNFINISHED, IN_ACTIVE_CYCLE] };
  const since = new Date(now - PAST[completed]).toISOString();
  return { or: [UNFINISHED, { completedAt: { gte: since } }, { canceledAt: { gte: since } }] };
}

// The two views as API issue filters: the active cycle's issues, and all of mine.
/**
 * @param {Display["completed"]} completed
 * @param {number} now
 */
export function filters(completed, now) {
  const finished = completedFilter(completed, now);
  return { cycle: finished ? { and: [IN_ACTIVE_CYCLE, finished] } : IN_ACTIVE_CYCLE, mine: finished };
}

/** @type {Record<string, string>} */
const SHOWING = { week: "in the past week", month: "in the past month", cycle: "during the current cycle" };

// The line beside a completed group: which finished issues show (said for these three choices only), and their order.
/**
 * @param {Display["completed"]} completed
 * @param {boolean} recency
 */
export const completedNote = (completed, recency) =>
  [SHOWING[completed] && `Showing issues completed ${SHOWING[completed]}`, recency && "Recent first"].filter(Boolean)
    .join(" · ");

// A group's estimate points, totalled as the tracker does: an issue without an estimate counts for its team's default.
/**
 * @param {Issue[]} issues
 * @param {Map<string, Team>} teams
 */
export const points = (issues, teams) =>
  issues.reduce((sum, issue) => sum + (issue.estimate ?? teams.get(issue.team.id)?.defaultIssueEstimate ?? 0), 0);

// Issues grouped by workflow state. `by` orders the issues inside a group ("priority": most urgent first, "title":
// A to Z) or the groups themselves ("status": in progress first); `reversed` flips that one order and leaves the
// other alone. With `recency`, finished groups ignore both and list their most recently finished issue first.
/**
 * @param {Issue[]} issues
 * @param {Partial<Display>} display
 */
export function groups(issues, { by = "priority", reversed = false, recency = false } = {}) {
  /** @type {Map<string, Group>} */
  const byState = new Map();
  for (const issue of issues) {
    let group = byState.get(issue.state.name);
    if (!group) byState.set(issue.state.name, group = { state: issue.state, issues: [] });
    group.issues.push(issue);
  }
  const flip = reversed ? -1 : 1, inside = by === "status" ? 1 : flip, across = by === "status" ? flip : 1;
  const within = WITHIN_GROUP[by] ?? WITHIN_GROUP.priority;
  for (const group of byState.values()) {
    group.issues.sort(recency && FINISHED.includes(group.state.type) ? byRecency : (a, b) => inside * within(a, b));
  }
  /** @param {Group} group */
  const place = (group) => GROUP_ORDER.indexOf(group.state.type);
  return [...byState.values()].sort((a, b) => across * (place(a) - place(b) || b.state.position - a.state.position));
}

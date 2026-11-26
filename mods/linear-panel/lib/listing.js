// What the list shows: which issues are asked for, how they are grouped and ordered, and what a group adds up to.
// Pure rules with no calls to Herdr, so node can test them (tests/unit)
import { Completed, Ordering, StateType } from "../enums.js";
import { DAY_MS } from "./history.js";
import { compareText } from "./text.js";

const DAYS_IN_MONTH = 30, DAYS_IN_WEEK = 7, NO_PRIORITY_URGENCY = 5;

/** @type {string[]} */
const FINISHED = [StateType.COMPLETED, StateType.CANCELED, StateType.DUPLICATE];
/** @type {string[]} */
const GROUP_ORDER = [
  StateType.STARTED, StateType.UNSTARTED, StateType.BACKLOG, StateType.TRIAGE, StateType.COMPLETED,
  StateType.CANCELED, StateType.DUPLICATE,
];
const IN_ACTIVE_CYCLE = { cycle: { isActive: { eq: true } } };
const PAST = {
  [Completed.DAY]: DAY_MS, [Completed.WEEK]: DAYS_IN_WEEK * DAY_MS, [Completed.MONTH]: DAYS_IN_MONTH * DAY_MS,
};
/** @type {Record<string, string>} */
const SHOWING = {
  [Completed.WEEK]: "in the past week", [Completed.MONTH]: "in the past month",
  [Completed.CYCLE]: "during the current cycle",
};
const UNFINISHED = { state: { type: { nin: FINISHED } } };

/** @param {Issue} issue */
export const isFinished = (issue) => FINISHED.includes(issue.state.type);

// The mod runtime's localeCompare compares code units (no ICU, options ignored), so the tracker's order is spelled out
/** @param {string} character */
const rank = (character) =>
  (/\s/u.test(character) ? 0 : /\p{L}/u.test(character) ? 3 : /\p{N}/u.test(character) ? 2 : 1);

// Titles in the tracker's own order: case ignored; spaces, then punctuation, then digits, then letters
/**
 * @param {string} first
 * @param {string} second
 */
export function byTitle(first, second) {
  const lowerFirst = first.toLowerCase(), lowerSecond = second.toLowerCase();
  for (let i = 0; i < lowerFirst.length && i < lowerSecond.length; i++) {
    if (lowerFirst[i] !== lowerSecond[i]) {
      return rank(lowerFirst[i]) - rank(lowerSecond[i]) || (lowerFirst[i] < lowerSecond[i] ? -1 : 1);
    }
  }
  return lowerFirst.length - lowerSecond.length;
}

// Issues by team key, then by number taken as a number, so BACK-9 comes before BACK-100
/**
 * @param {Issue} first
 * @param {Issue} second
 */
function byIdentifier(first, second) {
  const [keyA, numberA] = first.identifier.split("-"), [keyB, numberB] = second.identifier.split("-");
  return compareText(keyA, keyB) || Number(numberA) - Number(numberB);
}

/** @param {Issue} issue */
const urgency = (issue) => issue.priority || NO_PRIORITY_URGENCY;
/** @type {Record<string, (first: Issue, second: Issue) => number>} */
const WITHIN_GROUP = {
  [Ordering.PRIORITY]: (first, second) => urgency(first) - urgency(second) || byIdentifier(first, second),
  [Ordering.TITLE]: (first, second) => byTitle(first.title, second.title) || byIdentifier(first, second),
};

/** @param {Issue} issue */
const finishedAt = (issue) => issue.completedAt ?? issue.canceledAt ?? "";
// ISO dates compare as text
/**
 * @param {Issue} first
 * @param {Issue} second
 */
const byRecency = (first, second) =>
  compareText(finishedAt(second), finishedAt(first)) || byIdentifier(first, second);

// The "Completed issues" option as an API filter on finished issues: "all", "day", "week", "month" (finished since
// then), "cycle" (those of the active cycle) or "none". Unfinished issues always pass. Null lets every issue through
/**
 * @param {Completed} completed
 * @param {number} now
 */
function completedFilter(completed, now) {
  if (completed === Completed.ALL) return null;
  if (completed === Completed.NONE) return UNFINISHED;
  if (completed === Completed.CYCLE) return { or: [UNFINISHED, IN_ACTIVE_CYCLE] };
  const since = new Date(now - PAST[completed])
    .toISOString();
  return { or: [UNFINISHED, { completedAt: { gte: since } }, { canceledAt: { gte: since } }] };
}

/**
 * @param {Completed} completed
 * @param {number} now
 */
export function filters(completed, now) {
  const finished = completedFilter(completed, now);
  return { cycle: finished ? { and: [IN_ACTIVE_CYCLE, finished] } : IN_ACTIVE_CYCLE, mine: finished };
}

// Which finished issues show is said for these three choices only
/**
 * @param {Completed} completed
 * @param {boolean} recency
 */
export const completedNote = (completed, recency) =>
  [SHOWING[completed] && `Showing issues completed ${SHOWING[completed]}`, recency && "Recent first"].filter(Boolean)
    .join(" · ");

// As the tracker totals them: an issue without an estimate counts for its team's default
/**
 * @param {Pick<Issue, "estimate" | "team">[]} issues
 * @param {Map<string, Team>} teams
 */
export const points = (issues, teams) =>
  issues.reduce((sum, issue) => sum + (issue.estimate ?? teams.get(issue.team.id)?.defaultIssueEstimate ?? 0), 0);

// `by` orders the issues inside a group ("priority": most urgent first, "title": A to Z) or the groups themselves
// ("status": in progress first); `reversed` flips only that one. With `recency`, finished groups ignore both and
// list their most recently finished issue first
/**
 * @param {Issue[]} issues
 * @param {Partial<Display>} display
 */
export function groups(issues, { by = Ordering.PRIORITY, reversed = false, recency = false } = {}) {
  /** @type {Map<string, Group>} */
  const byState = new Map();
  for (const issue of issues) {
    let group = byState.get(issue.state.name);
    if (!group) byState.set(issue.state.name, group = { state: issue.state, issues: [] });
    group.issues.push(issue);
  }
  const byStatus = by === Ordering.STATUS, flip = reversed ? -1 : 1;
  const inside = byStatus ? 1 : flip, across = byStatus ? flip : 1;
  const within = WITHIN_GROUP[by] ?? WITHIN_GROUP[Ordering.PRIORITY];
  for (const group of byState.values()) {
    const inGroup = (/** @type {Issue} */ first, /** @type {Issue} */ second) => inside * within(first, second);
    group.issues.sort(recency && FINISHED.includes(group.state.type) ? byRecency : inGroup);
  }
  /** @param {Group} group */
  const place = (group) => GROUP_ORDER.indexOf(group.state.type);
  return [...byState.values()].sort((first, second) =>
    across * (place(first) - place(second) || second.state.position - first.state.position));
}

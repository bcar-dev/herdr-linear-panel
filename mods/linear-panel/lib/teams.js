// What a team offers its issues (workflow states, an estimate scale, members) and what several teams have in common.
// Pure rules with no calls to Herdr, so node can test them (tests/unit).
import { byTitle } from "./listing.js";

const WORKFLOW = ["triage", "backlog", "unstarted", "started", "completed", "canceled", "duplicate"];

// A team's states in the order its workflow runs, which is the order a status menu lists them.
/** @param {WorkflowState[]} states */
export const workflow = (states) =>
  [...states].sort((a, b) => WORKFLOW.indexOf(a.type) - WORKFLOW.indexOf(b.type) || a.position - b.position);

// The fraction of its pie a started state fills, by its place among the team's started states: half for the only
// one, half then three quarters for two, even steps for more. Half when the team's states are not known.
/**
 * @param {WorkflowState} state
 * @param {WorkflowState[]} states
 */
function progress(state, states) {
  const started = workflow(states).filter((s) => s.type === "started"),
    nth = started.findIndex((s) => s.id === state.id);
  if (nth < 0 || started.length === 1) return 0.5;
  if (started.length === 2) return nth === 0 ? 0.5 : 0.75;
  return (nth + 1) / (started.length + 1);
}

// The name of a state's icon: one per type, and for a started state a pie filled by eighths (status-started-1 to
// status-started-7). `states` are the states of the state's team.
/**
 * @param {WorkflowState} state
 * @param {WorkflowState[]} states
 */
export function statusIcon(state, states = []) {
  if (state.type === "started") {
    return `status-started-${Math.min(7, Math.max(1, Math.round(progress(state, states) * 8)))}`;
  }
  return `status-${WORKFLOW.includes(state.type) ? state.type : "unstarted"}`;
}

// The estimate scales: [values, the extra ones of an extended scale]. T-shirt sizes are stored as Fibonacci points.
/** @type {Record<string, number[][]>} */
const SCALES = {
  fibonacci: [[1, 2, 3, 5, 8], [13, 21]],
  exponential: [[1, 2, 4, 8, 16], [32, 64]],
  linear: [[1, 2, 3, 4, 5], [6, 7]],
  tShirt: [[1, 2, 3, 5, 8], [13, 21]],
};
/** @type {Record<number, string>} */
const SHIRTS = { 1: "XS", 2: "S", 3: "M", 5: "L", 8: "XL", 13: "XXL", 21: "XXXL" };

// The estimates a team's scale offers; none when the team does not estimate.
/** @param {Team} team */
export function estimates(team) {
  const scale = SCALES[team?.issueEstimationType];
  if (!scale) return [];
  return [...(team.issueEstimationAllowZero ? [0] : []), ...scale[0],
    ...(team.issueEstimationExtended ? scale[1] : [])];
}

// An estimate as the team's scale words it, or null for no estimate.
/**
 * @param {Team | undefined} team
 * @param {number | null} value
 */
export function estimateLabel(team, value) {
  if (value === null || value === undefined) return null;
  return (team?.issueEstimationType === "tShirt" && SHIRTS[value]) || String(value);
}

// What the issues of several teams can all be given: the statuses every team has (matched by name, listed in the
// first team's order); the people who belong to every team (matched by id, listed by username); the estimates every
// scale offers.
/** @param {Team[]} teams */
export const commonStates = (teams) =>
  workflow(teams[0]?.states ?? [])
    .filter((state) => teams.every((team) => team.states.some((other) => other.name === state.name)));

/** @param {Member} member */
const username = (member) => member.displayName || member.name;
/** @param {Team[]} teams */
export const commonMembers = (teams) =>
  (teams[0]?.members ?? [])
    .filter((member) => teams.every((team) => team.members.some((other) => other.id === member.id)))
    .sort((a, b) => byTitle(username(a), username(b)));

/** @param {Team[]} teams */
export const commonEstimates = (teams) =>
  estimates(teams[0]).filter((value) => teams.every((team) => estimates(team).includes(value)));

// The properties that can be changed on issues of these teams together, in the order menus list them. Without a
// team (none is loaded yet), only the priority, which every issue has.
/** @param {Team[]} teams */
export const changeable = (teams) => [
  commonStates(teams).length > 0 && "status",
  "priority",
  commonMembers(teams).length > 0 && "assign",
  commonEstimates(teams).length > 0 && "estimate",
].filter(Boolean);

// Whether `value` is the value of all of them ("all"), of part of them ("some") or of none (null).
/**
 * @param {unknown[]} values
 * @param {unknown} value
 */
export function share(values, value) {
  const count = values.filter((other) => other === value).length;
  return count === 0 ? null : count === values.length ? "all" : "some";
}

// The status changes that put `issues` in the status named `name`: [[stateId, issue ids]]. Statuses belong to a team,
// so each issue goes to its own team's status of that name. Issues already there, or whose team has none, stay.
/**
 * @param {Issue[]} issues
 * @param {Map<string, Team>} teams
 * @param {string} name
 */
export function moves(issues, teams, name) {
  /** @type {Map<string, string[]>} */
  const byState = new Map();
  for (const issue of issues) {
    const state = teams.get(issue.team.id)?.states.find((s) => s.name === name);
    if (state && state.id !== issue.state.id) byState.set(state.id, [...(byState.get(state.id) ?? []), issue.id]);
  }
  return [...byState];
}

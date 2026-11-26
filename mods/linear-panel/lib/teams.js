// What a team offers its issues (workflow states, an estimate scale, members) and what several teams have in common.
// Pure rules with no calls to Herdr, so node can test them (tests/unit)
import { Mark, Property, StateType } from "../enums.js";
import { pieIcon } from "./cycles.js";
import { byTitle } from "./listing.js";

/** @type {string[]} */
const WORKFLOW = [
  StateType.TRIAGE, StateType.BACKLOG, StateType.UNSTARTED, StateType.STARTED, StateType.COMPLETED,
  StateType.CANCELED, StateType.DUPLICATE,
];

/** @param {WorkflowState[]} states */
export const workflow = (states) =>
  [...states].sort((first, second) =>
    WORKFLOW.indexOf(first.type) - WORKFLOW.indexOf(second.type) || first.position - second.position);

// The fraction of its pie a started state fills, by its place among the team's started states: half for the only
// one, half then three quarters for two, even steps for more. Half when the team's states are not known
/**
 * @param {WorkflowState} state
 * @param {WorkflowState[]} states
 */
function progress(state, states) {
  const started = workflow(states)
      .filter((candidate) => candidate.type === StateType.STARTED),
    nth = started.findIndex((candidate) => candidate.id === state.id);
  if (nth < 0 || started.length === 1) return 0.5;
  if (started.length === 2) return nth === 0 ? 0.5 : 0.75;
  return (nth + 1) / (started.length + 1);
}

// Started is a pie, drawn by pieIcon
/** @type {Record<string, string>} */
export const STATUS_ICONS = {
  [StateType.BACKLOG]: "status-backlog", [StateType.CANCELED]: "status-canceled",
  [StateType.COMPLETED]: "status-completed", [StateType.DUPLICATE]: "status-duplicate",
  [StateType.TRIAGE]: "status-triage", [StateType.UNSTARTED]: "status-unstarted",
};

// A started state's pie is filled by eighths (status-started-1 to -7). `states` are the states of the state's team
/**
 * @param {WorkflowState} state
 * @param {WorkflowState[]} states
 */
export function statusIcon(state, states = []) {
  if (state.type === StateType.STARTED) {
    return pieIcon(progress(state, states));
  }
  return STATUS_ICONS[state.type] ?? STATUS_ICONS[StateType.UNSTARTED];
}

// The estimate scales: the values, and the extra ones of an extended scale. T-shirt sizes are stored as Fibonacci
// points
/** @type {Record<string, { values: number[], extended: number[] }>} */
const SCALES = {
  fibonacci: { values: [1, 2, 3, 5, 8], extended: [13, 21] },
  exponential: { values: [1, 2, 4, 8, 16], extended: [32, 64] },
  linear: { values: [1, 2, 3, 4, 5], extended: [6, 7] },
  tShirt: { values: [1, 2, 3, 5, 8], extended: [13, 21] },
};
/** @type {Record<number, string>} */
const SHIRTS = { 1: "XS", 2: "S", 3: "M", 5: "L", 8: "XL", 13: "XXL", 21: "XXXL" };

/** @param {Team} team */
export function estimates(team) {
  const scale = SCALES[team?.issueEstimationType];
  if (!scale) return [];
  return [...(team.issueEstimationAllowZero ? [0] : []), ...scale.values,
    ...(team.issueEstimationExtended ? scale.extended : [])];
}

/**
 * @param {Team | undefined} team
 * @param {number | null} value
 */
export function estimateLabel(team, value) {
  if (value === null || value === undefined) return null;
  return (team?.issueEstimationType === "tShirt" && SHIRTS[value]) || String(value);
}

// "3 Points", "1 Point", "No estimate"; a T-shirt scale's size as it is ("M")
/**
 * @param {Team | undefined} team
 * @param {number | null} value
 */
export function estimateText(team, value) {
  const label = estimateLabel(team, value);
  if (label === null) return "No estimate";
  return team?.issueEstimationType === "tShirt" ? label : `${label} ${value === 1 ? "Point" : "Points"}`;
}

// Statuses are matched by name and listed in the first team's order; people are matched by id and listed by username
/** @param {Team[]} teams */
export const commonStates = (teams) =>
  workflow(teams[0]?.states ?? [])
    .filter((state) => teams.every((team) => team.states.some((other) => other.name === state.name)));

/** @param {Pick<Member, "displayName" | "name">} member */
export const memberName = (member) => member.displayName || member.name;
/** @param {Team[]} teams */
export const commonMembers = (teams) =>
  (teams[0]?.members ?? [])
    .filter((member) => teams.every((team) => team.members.some((other) => other.id === member.id)))
    .sort((first, second) => byTitle(memberName(first), memberName(second)));

/** @param {Team[]} teams */
export const commonEstimates = (teams) =>
  estimates(teams[0])
    .filter((value) => teams.every((team) => estimates(team)
      .includes(value)));

// A cycle belongs to one team: only issues of a single team share any
/** @param {Team[]} teams */
export const commonCycles = (teams) => (teams.length === 1 ? teams[0].cycles ?? [] : []);

// Without a team (none is loaded yet), only the priority, which every issue has
/** @param {Team[]} teams */
export const changeable = (teams) => [
  commonStates(teams).length > 0 && Property.STATUS,
  Property.PRIORITY,
  commonMembers(teams).length > 0 && Property.ASSIGN,
  commonEstimates(teams).length > 0 && Property.ESTIMATE,
  commonCycles(teams).length > 0 && Property.CYCLE,
].filter(Boolean);

/**
 * @param {unknown[]} values
 * @param {unknown} value
 * @returns {Choice["mark"]}
 */
export function share(values, value) {
  const count = values.filter((other) => other === value).length;
  return count === 0 ? null : count === values.length ? Mark.ALL : Mark.SOME;
}

// [[stateId, issue ids]]. Issues already there, or whose team has none, stay
/**
 * @param {Issue[]} issues
 * @param {Map<string, Team>} teams
 * @param {string} name
 */
export function moves(issues, teams, name) {
  /** @type {Map<string, string[]>} */
  const byState = new Map();
  for (const issue of issues) {
    const state = teams.get(issue.team.id)?.states.find((candidate) => candidate.name === name);
    if (state && state.id !== issue.state.id) byState.set(state.id, [...(byState.get(state.id) ?? []), issue.id]);
  }
  return [...byState];
}

// The rows of the choices of a property (status, priority, estimate, assignee, cycle) for some issues. Pure, so node
// can test it (tests/unit)
import { PRIORITIES } from "../config.js";
import { Property, RequestKind } from "../enums.js";
import { assigneeRows } from "./assignees.js";
import { CycleTense, cycleName, cycleNote, pickable, tense } from "./cycles.js";
import { commonCycles, commonEstimates, commonStates, estimateText, memberName, share } from "./teams.js";

const DIGIT_KEYS_MAX = 9;

/**
 * What a row stands for, for its icon: one shape per property
 * @typedef {{ property: typeof Property.STATUS, state: WorkflowState }
 *   | { property: typeof Property.PRIORITY, value: number }
 *   | { property: typeof Property.ESTIMATE, value: number | null }
 *   | { property: typeof Property.ASSIGN, member: Member | null }
 *   | { property: typeof Property.CYCLE, cycle: null }
 *   | { property: typeof Property.CYCLE, cycle: Cycle, tense: CycleTense }} ChoiceSource
 */

/**
 * @typedef {object} ChoiceRow
 * @property {string} label
 * @property {string} [note] dim text after the label
 * @property {string} words what a query is matched against
 * @property {string | null} [key] the digit that picks it
 * @property {number} group the block of the list it is in: a rule sets blocks apart
 * @property {string} [title] the name of its block, shown above the block instead of a rule
 * @property {Choice["mark"]} mark whether all ("all"), part ("some") or none (null) of the issues hold it
 * @property {ChoiceSource} source what the row stands for
 * @property {Ask} ask what picking it asks the panel for
 */

/**
 * @param {Omit<ChoiceRow, "group" | "words"> & { group?: number, words?: string }} row
 * @returns {ChoiceRow}
 */
const choice = (row) => ({ group: 0, ...row, words: row.words ?? [row.label, row.note].filter(Boolean)
  .join(" ") });

/** @param {IssueUpdate} input */
const update = (input) => /** @type {Ask} */ ({ kind: RequestKind.UPDATE, input });

/**
 * @typedef {object} ChoiceContext
 * @property {Issue[]} targets
 * @property {Team[]} teams
 * @property {string} me
 * @property {Member[]} projectMembers
 * @property {number} now
 * @property {(value: unknown, read: (issue: Issue) => unknown) => Choice["mark"]} held
 */

/** @type {Partial<Record<Page, (about: ChoiceContext) => ChoiceRow[]>>} */
const ROWS = {
  [Property.STATUS]: ({ teams, held }) => commonStates(teams)
    .map((state, nth) => choice({ label: state.name,
      key: nth < DIGIT_KEYS_MAX ? String(nth + 1) : null, mark: held(state.name, (issue) => issue.state.name),
      source: { property: Property.STATUS, state },
      ask: { kind: RequestKind.STATUS, name: state.name } })),
  [Property.PRIORITY]: ({ held }) => PRIORITIES.map(({ id, label }) => choice({ label, key: String(id),
    mark: held(id, (issue) => issue.priority), source: { property: Property.PRIORITY, value: id },
    ask: update({ priority: id }) })),
  [Property.ESTIMATE]: ({ teams, held }) => [null, ...commonEstimates(teams)].map((value) => choice({
    label: estimateText(teams[0], value), mark: held(value, (issue) => issue.estimate ?? null),
    source: { property: Property.ESTIMATE, value }, ask: update({ estimate: value }) })),
  [Property.ASSIGN]: ({ targets, teams, me, projectMembers, held }) =>
    assigneeRows(targets, teams, projectMembers, me)
      .map(({ member, group, title }) => (member
        ? choice({ label: memberName(member), group, title, words: `${member.name} ${member.displayName}`,
          mark: held(member.id, (issue) => issue.assignee?.id ?? null),
          source: { property: Property.ASSIGN, member }, ask: update({ assigneeId: member.id }) })
        : choice({ label: "No assignee", key: "0", group, mark: held(null, (issue) => issue.assignee?.id ?? null),
          source: { property: Property.ASSIGN, member: null }, ask: update({ assigneeId: null }) }))),
  [Property.CYCLE]: ({ teams, now, held }) => {
    const cycles = commonCycles(teams);
    /** @param {Issue} issue */
    const inCycle = (issue) => issue.cycle?.id ?? null;
    return [
      choice({ label: "No cycle", key: "0", mark: held(null, inCycle),
        source: { property: Property.CYCLE, cycle: null }, ask: update({ cycleId: null }) }),
      ...pickable(cycles, now)
        .map((cycle) => choice({ label: cycleName(cycle), note: cycleNote(cycle, cycles, now),
          group: tense(cycle, cycles, now) === CycleTense.PREVIOUS ? 1 : 0, mark: held(cycle.id, inCycle),
          source: { property: Property.CYCLE, cycle, tense: tense(cycle, cycles, now) },
          ask: update({ cycleId: cycle.id }) })),
    ];
  },
};

/**
 * @param {Page} page
 * @param {{ targets: Issue[], teams: Team[], me: string, projectMembers: Member[], now?: number }} about
 * @returns {ChoiceRow[]}
 */
export function choiceRows(page, { targets, teams, me, projectMembers, now = Date.now() }) {
  const held = (/** @type {unknown} */ value, /** @type {(issue: Issue) => unknown} */ read) =>
    share(targets.map(read), value);
  return ROWS[page]?.({ targets, teams, me, projectMembers, now, held }) ?? [];
}

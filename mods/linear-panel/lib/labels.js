// Which labels the label picker lists, and in what order
import { compareText } from "./text.js";

const FREQUENT_MOST = 3, WORN_MORE_THAN_ONCE = 1;

// Labels worn once or never are not frequent
/**
 * @param {Issue[]} issues
 * @param {AnyLabel[]} offered
 * @param {number} [most]
 */
export function frequent(issues, offered, most = FREQUENT_MOST) {
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const issue of issues) for (const { id } of issue.labels.nodes) counts.set(id, (counts.get(id) ?? 0) + 1);
  return offered.filter((label) => !label.isGroup && (counts.get(label.id) ?? 0) > WORN_MORE_THAN_ONCE)
    .sort((first, second) => (counts.get(second.id) ?? 0) - (counts.get(first.id) ?? 0))
    .slice(0, most)
    .map((label) => label.id);
}

/**
 * @param {AnyLabel} label
 * @param {AnyLabel[]} all
 */
export const groupOf = (label, all) => all.find((other) => other.id === label.parent?.id)?.name ?? "";

// A group holds labels, it is not worn
/**
 * @param {AnyLabel[]} all
 * @param {string} query
 */
export const matching = (all, query) => all.filter((label) => !label.isGroup
  && label.name.toLowerCase()
    .includes(query.trim()
      .toLowerCase()));

// A label of a group is listed as its group, with the label as what it holds, and a group is listed once. Each row is
// { label, child }, `child` set for a group
/**
 * @param {AnyLabel[]} all
 * @param {string[]} wornIds
 */
export function wornRows(all, wornIds) {
  /** @type {{ label: AnyLabel, child?: AnyLabel }[]} */
  const rows = [];
  for (const id of wornIds) {
    const label = all.find((other) => other.id === id);
    if (!label) continue;
    const group = label.parent ? all.find((other) => other.id === label.parent?.id) : undefined;
    if (group) {
      if (!rows.some((row) => row.label.id === group.id)) rows.push({ label: group, child: label });
    } else rows.push({ label });
  }
  return rows;
}

// Labels in alphabetical order, whatever the case ("incident" among "EPIC" and "Legal")
/** @param {AnyLabel[]} labels */
const alphabetical = (labels) =>
  [...labels].sort((left, right) => compareText(left.name.toLowerCase(), right.name.toLowerCase()));

/**
 * @param {AnyLabel[]} all
 * @param {string} group
 */
export const childrenOf = (all, group) => alphabetical(all.filter((label) => label.parent?.id === group));

/** @param {AnyLabel[]} labels */
const ordered = (labels) => [...alphabetical(labels.filter((label) => label.isGroup)),
  ...alphabetical(labels.filter((label) => !label.isGroup))];

// Blocks are { title, labels }; groups open a page of their own
/**
 * @param {AnyLabel[]} all
 * @param {string[]} frequentIds
 */
export function blocks(all, frequentIds) {
  const top = all.filter((label) => !label.parent);
  return [
    { title: "Frequently used", labels: frequentIds.flatMap((id) => all.filter((label) => label.id === id)) },
    { title: "Team labels", labels: ordered(top.filter((label) => label.team)) },
    { title: "Workspace labels", labels: ordered(top.filter((label) => !label.team)) },
  ].filter((block) => block.labels.length);
}

// What a page shows: the labels of a group, or those that are in none
/**
 * @param {AnyLabel[]} labels
 * @param {string | undefined} group
 */
export const shownLabels = (labels, group) =>
  (group ? labels.filter((label) => label.parent?.id === group) : labels.filter((label) => !label.parent));

/**
 * @param {Issue} issue
 * @param {AnyLabel[]} labels
 * @param {string} [group]
 */
export const placeholderFor = (issue, labels, group) => (group
  ? `${labels.find((label) => label.id === group)?.name ?? "Label"}…`
  : issue.labels.nodes.length ? "Change or add labels…" : "Add labels…");

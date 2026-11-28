// An issue's merge requests: how its row and their card name them and color them. Pure rules with no calls to Herdr,
// so node can test them (tests/unit)
import { SourceType } from "../enums.js";
import { timeLabel } from "./history.js";

const ELLIPSIS = "...", INITIALS_LENGTH = 2;

/** Where a merge request stands, as the tracker keeps it: `OPEN`, `IN_REVIEW` and `DRAFT` are not merged yet */
export const MergeStatus = Object.freeze({
  CLOSED: "closed", DRAFT: "draft", IN_REVIEW: "inReview", MERGED: "merged", OPEN: "open",
});
/** @typedef {typeof MergeStatus[keyof typeof MergeStatus]} MergeStatus */

export const MergeStanding = Object.freeze({
  CLOSED: MergeStatus.CLOSED, DRAFT: MergeStatus.DRAFT, MERGED: MergeStatus.MERGED, OPEN: MergeStatus.OPEN,
});
/** @typedef {typeof MergeStanding[keyof typeof MergeStanding]} MergeStanding */

/** Where merge requests stand, for their color: `MIXED` when some are merged and others open */
export const MergeTint = Object.freeze({ ...MergeStanding, MIXED: "mixed" });
/** @typedef {typeof MergeTint[keyof typeof MergeTint]} MergeTint */

// An attachment with no number is some other link of the same source (a commit, say), not a merge request
/** @param {Issue} issue */
export const merges = (issue) => issue.attachments.nodes.filter(({ metadata }) => typeof metadata.number === "number")
  .map(({ sourceType, metadata }) => /** @type {Merge} */ ({ ...metadata, sourceType }));

/** @type {MergeStatus[]} */
const STANDING_STATUSES = [MergeStatus.MERGED, MergeStatus.CLOSED, MergeStatus.DRAFT];

/**
 * @param {Merge} merge
 * @returns {MergeStanding}
 */
export const standing = (merge) => (STANDING_STATUSES.includes(merge.status)
  ? /** @type {MergeStanding} */ (merge.status) : MergeStanding.OPEN);

// The color of several merge requests together. The closed ones count only when all are closed, and the drafts are
// grey only when all that are left are drafts: next to an open one, a draft counts as open
/**
 * @param {Merge[]} list
 * @returns {MergeTint}
 */
export function tint(list) {
  const live = list.map(standing)
    .filter((status) => status !== MergeStanding.CLOSED);
  if (!live.length) return MergeTint.CLOSED;
  if (live.every((status) => status === MergeStanding.DRAFT)) return MergeTint.DRAFT;
  const merged = live.filter((status) => status === MergeStanding.MERGED).length;
  return merged === live.length ? MergeTint.MERGED : merged ? MergeTint.MIXED : MergeTint.OPEN;
}

// GitLab numbers its merge requests "!3463", GitHub its pull requests "#47"
/** @param {Merge} merge */
const numbered = (merge) => `${merge.sourceType === SourceType.GITLAB ? "!" : "#"}${merge.number}`;

/**
 * @param {Merge} merge
 * @param {boolean} owner
 */
export const reference = (merge, owner) =>
  `${owner ? `${merge.repoLogin}/` : ""}${merge.repoName}${numbered(merge)}`;

/** @param {Merge[]} list */
export const chipLabel = ([first, ...rest]) => (first && !rest.length ? numbered(first) : `${rest.length + 1} PRs`);

/** @param {string} login */
export const initials = (login) => login.slice(0, INITIALS_LENGTH)
  .toUpperCase();

/** @param {string[]} names */
export function reviewedBy(names) {
  if (!names.length) return "";
  const listed = names.length === 1 ? names[0] : `${names.slice(0, -1)
    .join(", ")} and ${names.at(-1)}`;
  return `Reviewed by ${listed}`;
}

/**
 * @param {Merge} merge
 * @param {number} now
 */
export function when(merge, now) {
  const [verb, at] = merge.status === MergeStatus.MERGED ? ["Merged", merge.mergedAt]
    : merge.status === MergeStatus.CLOSED ? ["Closed", merge.closedAt] : ["Opened", merge.createdAt];
  return `${verb} ${timeLabel(now - Date.parse(at ?? merge.createdAt))} ago`;
}

// `most` includes the three dots
/**
 * @param {string} title
 * @param {number} most
 */
export function clipped(title, most) {
  const letters = [...title];
  return letters.length > most ? `${letters.slice(0, most - ELLIPSIS.length)
    .join("")}${ELLIPSIS}` : title;
}

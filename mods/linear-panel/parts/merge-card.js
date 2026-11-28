// The tooltip of a row's merge requests: a card on one, or a block for each of several. Drawing only: what they
// changed and who reviewed them is read from the panel, which asks the tracker when the pointer comes on them
import { div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { icon, shipped } from "../config.js";
import { MERGE_COLORS, face } from "../ui.js";
import { MergeStanding, initials, merges, reference, reviewedBy, standing, when } from "../lib/merges.js";
import { PENDING } from "../lib/lookups.js";
import { textWidth } from "../lib/placement.js";

const AUTHOR_FACE_BLUE = "#1d8cf0";
const BLOCK_GAP_PX = 6;
const BLOCK_HEIGHT_PX = 46;
const CARD_MAX_WIDTH_PX = 360;
const CARD_PADDING_PX = 12;
const DETAILS_GAP_PX = 16;
const FACTS_ROW_HEIGHT_PX = 22;
const LINE_HEIGHT_PX = 20;
const MORE_ROW_HEIGHT_PX = 26;
const MOST_BLOCKS_SHOWN = 8;
const REVIEWER_WIDTH_PX = 40;
const SEVERAL_HEIGHT_PX = 17;
const SINGLE_HEIGHT_PX = 67;
const TITLE_BESIDE_PX = 48;
const TITLE_INDENT_PX = 22;
const TITLE_WRAP_MARGIN_PX = 60;

/** @type {Record<MergeStanding, string>} */
const ICONS = {
  [MergeStanding.CLOSED]: "git-pull-request-closed", [MergeStanding.DRAFT]: "git-pull-request-draft",
  [MergeStanding.MERGED]: "git-merge", [MergeStanding.OPEN]: "git-pull-request",
};

/** @param {Merge} merge */
const mark = (merge) => div()
  .h(LINE_HEIGHT_PX)
  .flex_none()
  .flex()
  .items_center()
  .child(svg(icon(ICONS[standing(merge)]))
    .size(14)
    .text_color(MERGE_COLORS[standing(merge)]));

/**
 * @param {Merge} merge
 * @param {number} lines
 * @param {string} below
 * @param {Theme} t
 */
const heading = (merge, lines, below, t) => [
  h_flex()
    .gap(8)
    .items_start()
    .child(mark(merge))
    .child(div()
      .flex_1()
      .min_w(0)
      .h(LINE_HEIGHT_PX * lines)
      .overflow_hidden()
      .when(lines === 1, (element) => element.truncate())
      .child(merge.title))
    .child(div()
      .h(LINE_HEIGHT_PX)
      .flex_none()
      .flex()
      .items_center()
      .child(face(initials(merge.userLogin), AUTHOR_FACE_BLUE))),
  div()
    .h(LINE_HEIGHT_PX)
    .flex_none()
    .pl(TITLE_INDENT_PX)
    .truncate()
    .text_color(t.muted)
    .child(below),
];

/**
 * @param {Panel} panel
 * @param {Issue} issue
 * @param {Theme} t
 * @returns {TipBody}
 */
export function mergeCard(panel, issue, t) {
  const list = merges(issue), [only] = list;
  if (only && list.length === 1) return mergeCardOf(panel, issue, only, t);
  const answered = panel.store.mergeDetailsByIssueId.get(issue.id);
  return several(list, (merge) => answered?.find((found) => found.url === merge.url), t);
}

/**
 * @param {Panel} panel
 * @param {Issue} issue
 * @param {Merge} merge
 * @param {Theme} t
 * @returns {TipBody}
 */
export function mergeCardOf(panel, issue, merge, t) {
  const answered = panel.store.mergeDetailsByIssueId.get(issue.id);
  return single(merge, answered?.find((found) => found.url === merge.url), answered === PENDING, t);
}

/**
 * @param {Merge} merge
 * @param {MergeDetails | undefined} details
 * @param {boolean} pending
 * @param {Theme} t
 * @returns {TipBody}
 */
function single(merge, details, pending, t) {
  const said = [when(merge, Date.now()), details ? `${details.files} files` : pending && "…"].filter(Boolean)
    .join(" · ");
  const added = details ? `+${details.added}` : "", removed = details ? `-${details.removed}` : "";
  const reviewers = details?.reviewers ?? [], below = reference(merge, false);
  const width = Math.ceil(Math.min(CARD_MAX_WIDTH_PX, CARD_PADDING_PX + Math.max(
    TITLE_BESIDE_PX + textWidth(merge.title), TITLE_INDENT_PX + textWidth(below), TITLE_INDENT_PX + textWidth(said)
    + (details ? DETAILS_GAP_PX + textWidth(added) + textWidth(removed) : 0) + REVIEWER_WIDTH_PX * reviewers.length)));
  const lines = textWidth(merge.title) > width - TITLE_WRAP_MARGIN_PX ? 2 : 1;
  const el = v_flex()
    .w(width)
    .px(6)
    .pt(9)
    .pb(8)
    .children(heading(merge, lines, below, t))
    .child(h_flex()
      .h(FACTS_ROW_HEIGHT_PX)
      .mt(8)
      .pl(TITLE_INDENT_PX)
      .gap(8)
      .flex_none()
      .items_center()
      .child(div()
        .flex_none()
        .text_color(t.muted)
        .child(said))
      .children(details ? [div()
        .flex_none()
        .text_color(MERGE_COLORS[MergeStanding.OPEN])
        .child(added),
      div()
        .flex_none()
        .text_color(MERGE_COLORS[MergeStanding.CLOSED])
        .child(removed)] : [])
      .child(div()
        .flex_1())
      .children(reviewers.map((reviewer) => h_flex()
        .flex_none()
        .gap(4)
        .items_center()
        .child(face(initials(reviewer.name), AUTHOR_FACE_BLUE))
        .children(reviewer.approved
          ? [svg(shipped("check"))
            .size(12)
            .text_color(MERGE_COLORS[MergeStanding.OPEN])] : []))));
  return { el, width, height: SINGLE_HEIGHT_PX + LINE_HEIGHT_PX * lines };
}

/**
 * @param {Merge[]} list
 * @param {(merge: Merge) => MergeDetails | undefined} detailsOf
 * @param {Theme} t
 * @returns {TipBody}
 */
function several(list, detailsOf, t) {
  const shown = list.slice(0, MOST_BLOCKS_SHOWN), more = list.length - shown.length;
  const blocks = shown.map((merge) => ({ merge, below: [reference(merge, true),
    reviewedBy((detailsOf(merge)?.reviewers ?? []).map((reviewer) => reviewer.name))].filter(Boolean)
    .join(" · ") }));
  const width = Math.ceil(Math.min(CARD_MAX_WIDTH_PX, CARD_PADDING_PX + Math.max(...blocks
    .map(({ merge, below }) => Math.max(TITLE_BESIDE_PX + textWidth(merge.title),
      TITLE_INDENT_PX + textWidth(below))))));
  const el = v_flex()
    .w(width)
    .px(6)
    .pt(9)
    .pb(8)
    .gap(BLOCK_GAP_PX)
    .children(blocks.map(({ merge, below }) => v_flex()
      .flex_none()
      .children(heading(merge, 1, below, t))))
    .children(more ? [div()
      .h(LINE_HEIGHT_PX)
      .flex_none()
      .pl(TITLE_INDENT_PX)
      .text_color(t.muted)
      .child(`${more} more`)] : []);
  const height = SEVERAL_HEIGHT_PX + BLOCK_HEIGHT_PX * shown.length - BLOCK_GAP_PX + (more ? MORE_ROW_HEIGHT_PX : 0);
  return { el, width, height };
}

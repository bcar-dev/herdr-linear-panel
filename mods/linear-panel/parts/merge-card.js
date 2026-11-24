// The tooltip of a row's merge requests: a card on one, or a block for each of several. Drawing only: what they
// changed and who reviewed them is read from the panel, which asks the tracker when the pointer comes on them.
import { div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { icon, shipped } from "../config.js";
import { MERGE_COLORS, face } from "../ui.js";
import { initials, merges, reference, reviewedBy, standing, when } from "../lib/merges.js";

/** @type {Record<MergeStanding, string>} */
const ICONS = { merged: "git-merge", open: "git-pull-request", closed: "git-pull-request-closed" };
// The round under a person's initials.
const FACE = "#1d8cf0";
// The blocks shown for several merge requests: more would run past the panel.
const MOST = 8;
// A mod cannot measure text: 6 px a character, as measured at the tooltip's size.
/** @param {string} text */
const reckoned = (text) => 6 * text.length;

/** @param {Merge} merge */
const mark = (merge) => div().h(20).flex_none().flex().items_center()
  .child(svg(icon(ICONS[standing(merge)])).size(14).text_color(MERGE_COLORS[standing(merge)]));

// A merge request's first lines: its icon, its title on `lines` lines and its author's initials, then `below`, muted,
// under the title.
/**
 * @param {Merge} merge
 * @param {number} lines
 * @param {string} below
 * @param {Theme} t
 */
const heading = (merge, lines, below, t) => [
  h_flex().gap(8).items_start()
    .child(mark(merge))
    .child(div().flex_1().min_w(0).h(20 * lines).overflow_hidden().when(lines === 1, (el) => el.truncate())
      .child(merge.title))
    .child(div().h(20).flex_none().flex().items_center().child(face(initials(merge.userLogin), FACE))),
  div().h(20).flex_none().pl(22).truncate().text_color(t.muted).child(below),
];

/**
 * @param {Panel} panel
 * @param {Issue} issue
 * @param {Theme} t
 * @returns {TipBody}
 */
export function mergeCard(panel, issue, t) {
  const list = merges(issue), asked = panel.merging.get(issue.id);
  /** @param {Merge} merge */
  const detailsOf = (merge) => asked?.details?.find((found) => found.url === merge.url);
  return list.length === 1 ? single(list[0], detailsOf(list[0]), asked?.details === null, t)
    : several(list, detailsOf, t);
}

// One merge request, as its card: under its title, its repository; then when it was merged, closed or opened, its
// changes (`…` while they are asked), and at the right the reviewers, a check after those who approved.
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
  // As wide as its widest line, with its padding: the title beside the icon and the author, the repository, or the
  // last line, its reviewers 40 px each.
  const width = Math.ceil(Math.min(360, 12 + Math.max(48 + reckoned(merge.title), 22 + reckoned(below),
    22 + reckoned(said) + (details ? 16 + reckoned(added) + reckoned(removed) : 0) + 40 * reviewers.length)));
  const lines = reckoned(merge.title) > width - 60 ? 2 : 1;
  const el = v_flex().w(width).px(6).pt(9).pb(8)
    .children(heading(merge, lines, below, t))
    .child(h_flex().h(22).mt(8).pl(22).gap(8).flex_none().items_center()
      .child(div().flex_none().text_color(t.muted).child(said))
      .children(details ? [div().flex_none().text_color(MERGE_COLORS.open).child(added),
        div().flex_none().text_color(MERGE_COLORS.closed).child(removed)] : [])
      .child(div().flex_1())
      .children(reviewers.map((reviewer) => h_flex().flex_none().gap(4).items_center()
        .child(face(initials(reviewer.name), FACE))
        .children(reviewer.approved ? [svg(shipped("check")).size(12).text_color(MERGE_COLORS.open)] : []))));
  return { el, width, height: 67 + 20 * lines };
}

// Several merge requests, a block each: its title on one line, then its repository and who reviewed it. Past eight,
// a line tells how many more there are.
/**
 * @param {Merge[]} list
 * @param {(merge: Merge) => MergeDetails | undefined} detailsOf
 * @param {Theme} t
 * @returns {TipBody}
 */
function several(list, detailsOf, t) {
  const shown = list.slice(0, MOST), more = list.length - shown.length;
  const blocks = shown.map((merge) => ({ merge, below: [reference(merge, true),
    reviewedBy((detailsOf(merge)?.reviewers ?? []).map((reviewer) => reviewer.name))].filter(Boolean).join(" · ") }));
  const width = Math.ceil(Math.min(360, 12 + Math.max(...blocks
    .map(({ merge, below }) => Math.max(48 + reckoned(merge.title), 22 + reckoned(below))))));
  const el = v_flex().w(width).px(6).pt(9).pb(8).gap(6)
    .children(blocks.map(({ merge, below }) => v_flex().flex_none().children(heading(merge, 1, below, t))))
    .children(more ? [div().h(20).flex_none().pl(22).text_color(t.muted).child(`${more} more`)] : []);
  return { el, width, height: 17 + 46 * shown.length - 6 + (more ? 26 : 0) };
}

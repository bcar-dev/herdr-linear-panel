// The panel's list: a group per status with its heading and rows, and the issue a drag carries.
// Drawing only. What the list shows is read from the panel; every press, release and click is handed back to it.
import { div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { icon, shipped } from "../config.js";
import { drawnColor } from "../tracker.js";
import { priorityColor, priorityMark, statusMark, zoom } from "../ui.js";
import { completedNote, isFinished, points } from "../lib/listing.js";
import { brighten } from "../lib/color.js";
import { timeInStatuses, timeLabel } from "../lib/history.js";
import { propertyKey } from "../lib/keys.js";
import { fitWidth } from "../lib/placement.js";
import { estimateLabel, statusIcon } from "../lib/teams.js";

// Colors a small mark (an icon, or an icon and a figure) and brightens it under the pointer, with no background.
// A hover style would not do: it recolors text, but an icon takes its color when it is described. So the panel
// notes which mark is under the pointer (`hot`) and draws again. `still` keeps it from answering the pointer.
// `tip` gives the mark a tooltip: its label, its keys, and what it says above them. `entered` runs when the pointer
// comes on the mark.
/**
 * @param {Panel} panel
 * @param {NativeElement} mark
 * @param {string} id
 * @param {Color} color
 * @param {Color} bright
 * @param {{
 *   still?: boolean, tip?: { label: string, caps: string[], body?: Tip["body"] }, entered?: (cx: Context) => void,
 * }} options
 */
function warming(panel, mark, id, color, bright, { still = false, tip, entered } = {}) {
  const colored = mark.id(id).text_color(panel.hot === id && !still ? bright : color);
  /** @type {(hovered: boolean, cx: Context) => void} */
  const hover = (hovered, cx) => {
    panel.heat(id, hovered, cx);
    if (hovered) entered?.(cx);
  };
  return tip ? panel.hints.on(colored, tip.label, { caps: tip.caps, body: tip.body, key: id, hover })
    : colored.on_hover(hover);
}

// How long an issue has been in each status, for the tooltip of its status mark: the status it is in now stands out.
// Answers the element with its size, which places the tooltip, or null until the tracker has answered.
/**
 * @param {Panel} panel
 * @param {Issue} issue
 * @param {Theme} t
 * @returns {TipBody | null}
 */
function timeInStatus(panel, issue, t) {
  const spans = panel.history.get(issue.id), states = panel.teams.get(issue.team.id)?.states;
  if (!spans) return null;
  const times = timeInStatuses(spans, Date.now());
  // Beside a status's name: its icon, the time and the gaps between them.
  const width = fitWidth(times.map(({ state }) => state.name), 64, 170, 260);
  const el = v_flex().w(width).pt(7).pb(5)
    .child(div().h(24).flex_none().flex().items_center().child("Time in status"))
    .children(times.map(({ state, ms, current }) => h_flex().h(24).flex_none().gap(8).items_center()
      .text_color(current ? t.foreground : t.muted)
      .child(statusMark(state, states))
      .child(div().flex_1().min_w(0).truncate().child(state.name))
      .child(div().flex_none().child(timeLabel(ms)))));
  return { el, width, height: 36 + 24 * times.length };
}

// While a drag is over the group, the theme's accent outlines it. The border is always there, in the background's
// color, so nothing shifts when it lights up.
/**
 * @param {Panel} panel
 * @param {Group} group
 * @param {Look} look
 */
export function section(panel, group, look) {
  const { t } = look;
  /** @param {number} nth */
  const ticked = (nth) => Boolean(group.issues[nth]) && panel.selection.has(group.issues[nth].id);
  // Ticked rows that follow each other read as one block: a row is `joined` to a ticked neighbor above or below it.
  /** @param {number} nth */
  const joined = (nth) => ({ above: ticked(nth) && ticked(nth - 1), below: ticked(nth) && ticked(nth + 1) });
  // A folded group keeps its heading, which a drag can still be dropped on, and hides its issues.
  const rows = panel.folded.has(group.state.name) ? []
    : group.issues.map((issue, nth) => row(panel, issue, group, look, joined(nth)));
  return v_flex().flex_none().mt(6).rounded(8).border_1()
    .border_color(panel.drag.over === group.state.name ? t.accent : t.background)
    .child(heading(panel, group, t))
    .children(rows);
}

// The figure is switched for every group by a click on any: estimate points (with the triangle) or issue count.
/**
 * @param {Panel} panel
 * @param {Group} group
 * @param {Theme} t
 */
function heading(panel, group, t) {
  const counting = panel.totals === "count";
  const note = group.state.type === "completed" ? completedNote(panel.display.completed, panel.display.recency) : "";
  const figure = warming(panel, h_flex().h(22).px(5).flex_none().gap(3).items_center().rounded(5).cursor_pointer(),
    `total-${group.state.id}`, t.muted, t.foreground);
  // The arrow and the heading's gap after it match a row's box and its gap (22 px), so the status lines up with the
  // priority marks.
  const arrow = warming(panel, div().w(15).h(18).flex_none().flex().items_center().justify_center().rounded(4)
    .cursor_pointer(),
    `fold-${group.state.id}`, t.dim, t.foreground);
  return h_flex().h(30).flex_none().px(8).gap(7).items_center().rounded(7).text_size(13).font_semibold()
    .text_color(t.foreground)
    .on_mouse_move((_e, cx) => panel.aim(group, cx))
    .on_mouse_up("left", (_e, cx) => panel.drop(group, cx))
    .child(panel.control(arrow, (cx) => panel.fold(group, cx))
      .child(svg(icon(panel.folded.has(group.state.name) ? "caret-right" : "caret-down")).size(12)))
    .child(statusMark(group.state, panel.teams.get(group.issues[0].team.id)?.states))
    .child(div().child(group.state.name))
    .child(panel.control(figure, (cx) => panel.switchTotals(cx))
      .when(!counting, (el) => el.child(svg(icon("estimate")).size(14)))
      .child(String(counting ? group.issues.length : points(group.issues, panel.teams))))
    .child(div().flex_1().min_w(0).truncate().text_size(11).font_normal().text_color(t.dim).child(note));
}

/**
 * @param {Panel} panel
 * @param {Issue} issue
 * @param {Group} group
 * @param {Look} look
 * @param {{ above: boolean, below: boolean }} joined
 */
function row(panel, issue, group, { t, identifierWidth, estimateWidth, lit }, joined) {
  const { selection, drag } = panel;
  const team = panel.teams.get(issue.team.id), estimate = estimateLabel(team, issue.estimate),
    ticked = selection.has(issue.id);
  // A ticked row wears the theme's accent, washed out; a little stronger under the pointer.
  const tint = t.accent.slice(0, 7);
  // While a popup is open on an issue, that row alone is lit: the others do not answer the pointer.
  const still = lit !== null;
  /**
   * @param {NativeElement} el
   * @param {Restyle} style
   */
  const hovers = (el, style) => (still ? el : el.hover(style));
  const { pressed } = drag;
  const carried = drag.carrying && pressed !== null && (pressed === issue.id || (ticked && selection.has(pressed)));
  // The box shows on a ticked row and under the pointer. Its outline takes the theme's accent while the pointer is
  // on the box itself, and it is filled once ticked. Hidden, it keeps its place, so the row does not shift.
  const boxShows = ticked || (!still && panel.hovered === issue.id);
  const box = panel.hints.on(
    hovers(div().id(`tick-${issue.id}`).size(14).flex_none().flex().items_center().justify_center().rounded(3)
      .border_1().border_color(ticked ? t.accent : t.input).bg(ticked ? t.accent : t.background),
    (s) => s.border_color(t.accent))
      .when(!boxShows, (el) => el.invisible()),
    "Select issue", { caps: ["X"], key: `tick-${issue.id}` });
  // The status keeps its own color, brighter under the pointer by as much as in the tracker's app: a stronger green,
  // not a paler one.
  const stateColor = drawnColor(issue.state.color);
  const status = warming(panel, div().size(18).flex_none().flex().items_center().justify_center(),
    `status-${issue.id}`, stateColor, brighten(stateColor, 0.32), {
      still,
      tip: { label: "Change status", caps: propertyKey("status").caps, body: (t) => timeInStatus(panel, issue, t) },
      entered: (cx) => panel.recall(issue, cx),
    });
  // An urgent mark keeps its orange under the pointer.
  const urgent = issue.priority === 1 && !isFinished(issue),
    plain = priorityColor(t, issue.priority, isFinished(issue));
  const urgency = warming(panel, div().size(14).flex_none().flex().items_center().justify_center(),
    `priority-${issue.id}`, plain, urgent ? plain : t.foreground,
    { still, tip: { label: "Change priority", caps: propertyKey("priority").caps } });
  const size = warming(panel, h_flex().h(20).px(4).gap(3).flex_none().items_center().rounded(5).text_size(11),
    `estimate-${issue.id}`, t.muted, t.foreground,
      { still, tip: { label: "Change estimate", caps: propertyKey("estimate").caps } });
  return h_flex().id(`issue-${issue.id}`).h(28).flex_none().px(8).gap(8).items_center().cursor_pointer()
    .rounded_t(joined.above ? 0 : 7).rounded_b(joined.below ? 0 : 7)
    .when(ticked, (el) => el.bg(/** @type {Color} */ (tint + "33")))
    .when(lit === issue.id && !ticked, (el) => el.bg(t.hover))
    .when(!still, (el) => el.hover((s) => s.bg(/** @type {Color} */ (ticked ? tint + "4d" : t.hover))))
    .when(carried, (el) => el.opacity(0.5))
    .on_hover((hovered, cx) => panel.hover(issue, hovered, cx))
    .on_mouse_down("left", (e) => drag.press(issue.id, e.position))
    .on_mouse_move((_e, cx) => panel.aim(group, cx))
    .on_mouse_up("left", (_e, cx) => panel.release(issue, group, cx))
    .on_mouse_down("right", (e, cx) => { cx.stop_propagation(); panel.openMenu(issue, e.position); })
    .child(panel.control(box, (cx, e) => panel.tick(issue, e.modifiers.shift, cx))
      .when(ticked, (el) => el.child(svg(shipped("check")).size(10).text_color(t.accent_foreground))))
    .child(panel.control(urgency, () => panel.pick(issue, "priority"))
      .child(svg(icon(`priority-${issue.priority || 0}`)).size(14)))
    .child(div().w(identifierWidth).flex_none().text_size(11).text_color(t.dim).child(issue.identifier))
    .child(panel.control(status, () => panel.pick(issue, "status"))
      .child(svg(icon(statusIcon(issue.state, team?.states))).size(14)))
    .child(div().flex_1().min_w(0).truncate().child(issue.title))
    // An issue without an estimate shows nothing here: its menu's "Estimate" gives it one.
    .children(estimate === null ? [] : [panel.control(size, () => panel.pick(issue, "estimate"))
      .child(div().w(13).flex_none().flex().justify_center().child(svg(icon("estimate")).size(13)))
      .child(div().w(estimateWidth).flex_none().text_center().child(estimate))]);
}

// What follows the pointer during a drag: the pressed issue, and how many ticked issues move with it.
// It sits beside the pointer, not under it: the group beneath must still get the release.
/**
 * @param {Panel} panel
 * @param {Theme} t
 */
export function carried(panel, t) {
  const { selection } = panel, { pressed, ghost } = panel.drag;
  // Both are set while an issue is carried, which is when this is drawn.
  if (pressed === null || ghost === null) return div();
  const issue = panel.index().get(pressed);
  if (!issue) return div();
  const others = selection.has(pressed) ? selection.size - 1 : 0;
  // The pointer's place comes in window pixels.
  const scale = zoom();
  return h_flex().absolute().left(ghost.x / scale + 14).top(ghost.y / scale + 10).h(30).max_w(320).px(9).gap(8)
    .items_center()
    .rounded(8)
    .bg(t.popover).border_1().border_color(t.accent).shadow_md().text_size(13)
    .child(priorityMark(t, issue.priority, isFinished(issue)))
    .child(div().flex_none().text_size(11).text_color(t.dim).child(issue.identifier))
    .child(div().min_w(0).truncate().child(issue.title))
    .when(others > 0, (el) => el.child(div().flex_none().px(5).rounded(8).bg(t.accent)
      .text_size(11).text_color(t.accent_foreground).child(`+${others}`)));
}

// The panel's list: a group per status with its heading and rows, and the issue a drag carries.
// Drawing only. What the list shows is read from the panel; every press, release and click is handed back to it
import { div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { icon, priorityEntry, shipped } from "../config.js";
import { Property, StateType } from "../enums.js";
import { drawnColor, openCycle, openLink } from "../tracker.js";
import { CYCLE_BLUE, cycleMark, mergeMark, priorityColor, priorityMark, statusMark, zoom } from "../ui.js";
import { completedNote, isFinished, points } from "../lib/listing.js";
import { chipLabel, merges, tint as tinted } from "../lib/merges.js";
import { brighten, withAlpha } from "../lib/color.js";
import { CycleTense, TENSES, cycleName, progressIcon, span, tense, weekdaysLeft } from "../lib/cycles.js";
import { timeInStatuses, timeLabel } from "../lib/history.js";
import { propertyKey } from "../lib/keys.js";
import { fitWidth, textWidth } from "../lib/placement.js";
import { mergeCard } from "./merge-card.js";
import { estimateLabel, statusIcon } from "../lib/teams.js";

const ABOUT_HEIGHT_PX = 20;
const CARRIED_OPACITY = 0.5;
const CYCLE_CARD_HEIGHT_PX = 76;
const CYCLE_CARD_MAX_WIDTH_PX = 320;
const CYCLE_CARD_PADDING_PX = 12;
const CYCLE_CARD_ROW_HEIGHT_PX = 22;
const CYCLE_FACT_GAP_PX = 16;
const CYCLE_FIGURE_GAP_PX = 4;
const CYCLE_ICON_PX = 14;
const CYCLE_TITLE_INDENT_PX = 22;
const FOLD_BUTTON_HEIGHT_PX = 18;
const FOLD_BUTTON_WIDTH_PX = 15;
const GHOST_MAX_WIDTH_PX = 320;
const GHOST_OFFSET_X_PX = 14;
const GHOST_OFFSET_Y_PX = 10;
const PERCENT = 100;
const ROW_MARK_PX = 13;
// The status mark takes clicks over 24 px, the least target WCAG 2.2 asks, yet fills only the 18 px of its slot
const STATUS_BUTTON_PX = 24, STATUS_SLOT_PX = 18;
const STATUS_HOVER_BRIGHTNESS = 0.32;
const STATUS_TIP_HEIGHT_PX = 36;
const STATUS_TIP_LABEL_REST_PX = 64;
const STATUS_TIP_MAX_WIDTH_PX = 260;
const STATUS_TIP_MIN_WIDTH_PX = 170;
const STATUS_TIP_ROW_HEIGHT_PX = 24;
const TICKED_ALPHA = 0.2;
const TICKED_HOVER_ALPHA = 0.3;

// Colors a small mark and brightens it under the pointer. A hover style would not do: it recolors text, but an icon
// takes its color when it is described. So the panel notes which mark is under the pointer (`hot`) and draws again.
// `still` keeps it from answering the pointer
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
export function warming(panel, mark, id, color, bright, { still = false, tip, entered } = {}) {
  const colored = mark.id(id)
    .text_color(panel.hot === id && !still ? bright : color);
  /** @type {(hovered: boolean, cx: Context) => void} */
  const hover = (hovered, cx) => {
    panel.heat(id, hovered, cx);
    if (hovered) entered?.(cx);
  };
  return tip ? panel.hints.on(colored, tip.label, { caps: tip.caps, body: tip.body, key: id, hover })
    : colored.on_hover(hover);
}

// A rounded pill on a row, with a mark and a figure in it: it is colored and warmed like the row's other controls
/**
 * @param {Panel} panel
 * @param {Theme} t
 * @param {string} id
 * @param {Parameters<typeof warming>[5]} options
 */
const chip = (panel, t, id, options) => warming(panel,
  h_flex()
    .h(20)
    .px(6)
    .gap(4)
    .flex_none()
    .items_center()
    .rounded(10)
    .border_1()
    .border_color(t.border)
    .text_size(11),
  id, t.muted, t.foreground, options);

// Answers the element with its size, which places the tooltip, or null until the tracker has answered
/**
 * @param {Panel} panel
 * @param {Issue} issue
 * @param {Theme} t
 * @returns {TipBody | null}
 */
export function timeInStatus(panel, issue, t) {
  const spans = panel.store.historyByIssueId.get(issue.id), states = panel.store.teams.get(issue.team.id)?.states;
  if (!spans) return null;
  const times = timeInStatuses(spans, Date.now());
  // Beside a status's name: its icon, the time and the gaps between them
  const width = fitWidth(times.map(({ state }) => state.name), STATUS_TIP_LABEL_REST_PX, STATUS_TIP_MIN_WIDTH_PX,
    STATUS_TIP_MAX_WIDTH_PX);
  const el = v_flex()
    .w(width)
    .pt(7)
    .pb(5)
    .child(div()
      .h(STATUS_TIP_ROW_HEIGHT_PX)
      .flex_none()
      .flex()
      .items_center()
      .child("Time in status"))
    .children(times.map(({ state, ms, current }) => h_flex()
      .h(STATUS_TIP_ROW_HEIGHT_PX)
      .flex_none()
      .gap(8)
      .items_center()
      .text_color(current ? t.foreground : t.muted)
      .child(statusMark(state, states))
      .child(div()
        .flex_1()
        .min_w(0)
        .truncate()
        .child(state.name))
      .child(div()
        .flex_none()
        .child(timeLabel(ms)))));
  return { el, width, height: STATUS_TIP_HEIGHT_PX + STATUS_TIP_ROW_HEIGHT_PX * times.length };
}

// The first line of a cycle's description is where a team writes its capacity
/**
 * @param {Panel} panel
 * @param {Issue} issue
 * @param {IssueCycle} cycle
 * @param {Theme} t
 * @returns {TipBody}
 */
export function cycleCard(panel, issue, cycle, t) {
  const now = Date.now(), when = tense(cycle, panel.store.teams.get(issue.team.id)?.cycles ?? [], now),
    left = weekdaysLeft(cycle, now);
  const facts = [TENSES[when] ?? "", when === CycleTense.CURRENT ? `${left} ${left === 1 ? "weekday" : "weekdays"} left`
    : span(cycle)].filter(Boolean);
  // A cycle to come has nothing done yet: it tells the points planned in it, once the tracker has answered. "of" is
  // muted, the figures are not
  const ahead = Date.parse(cycle.startsAt) > now;
  const figures = ahead ? [String(panel.store.plannedPointsByCycleId.get(cycle.id) ?? "…")]
    : [`${Math.round(cycle.progress * PERCENT)}%`, "of", String(cycle.scopeHistory.at(-1) ?? 0)];
  const about = cycle.description?.split("\n")[0]?.trim() ?? "";
  const last = CYCLE_ICON_PX + figures.reduce((sum, figure) => sum + CYCLE_FIGURE_GAP_PX + textWidth(figure), 0)
    + facts.reduce((sum, fact) => sum + CYCLE_FACT_GAP_PX + textWidth(fact), 0);
  const width = Math.ceil(Math.min(CYCLE_CARD_MAX_WIDTH_PX,
    CYCLE_CARD_PADDING_PX + Math.max(CYCLE_TITLE_INDENT_PX + textWidth(cycleName(cycle)), textWidth(about), last)));
  const el = v_flex()
    .w(width)
    .px(6)
    .pt(9)
    .pb(8)
    .child(h_flex()
      .h(CYCLE_CARD_ROW_HEIGHT_PX)
      .flex_none()
      .gap(8)
      .items_center()
      .child(cycleMark(when, CYCLE_ICON_PX, t.muted))
      .child(div()
        .flex_1()
        .min_w(0)
        .truncate()
        .child(cycleName(cycle))))
    .children(about ? [div()
      .h(ABOUT_HEIGHT_PX)
      .flex_none()
      .truncate()
      .text_color(t.muted)
      .child(about)] : [])
    .child(div()
      .h(1)
      .my(7)
      .flex_none()
      .bg(t.border))
    .child(h_flex()
      .h(CYCLE_CARD_ROW_HEIGHT_PX)
      .flex_none()
      .gap(16)
      .items_center()
      .child(h_flex()
        .flex_none()
        .gap(4)
        .items_center()
        .child(ahead ? svg(icon("estimate"))
          .size(14)
          .flex_none()
          .text_color(t.muted)
        : svg(icon(progressIcon(cycle.progress)))
          .size(14)
          .flex_none()
          .text_color(CYCLE_BLUE))
        .children(figures.map((figure) => div()
          .flex_none()
          .when(figure === "of",
            (element) => element.text_color(t.muted))
          .child(figure))))
      .children(facts.map((fact) => div()
        .flex_none()
        .child(fact))));
  return { el, width, height: CYCLE_CARD_HEIGHT_PX + (about ? ABOUT_HEIGHT_PX : 0) };
}

/**
 * @param {Panel} panel
 * @param {Group} group
 * @param {Look} look
 */
export function section(panel, group, look) {
  const { t } = look;
  /** @param {number} nth */
  const ticked = (nth) => panel.selection.has(group.issues[nth]?.id ?? "");
  /** @param {number} nth */
  const joined = (nth) => ({ above: ticked(nth) && ticked(nth - 1), below: ticked(nth) && ticked(nth + 1) });
  const rows = panel.folded.has(group.state.name) ? []
    : group.issues.map((issue, nth) => row(panel, issue, group, look, joined(nth)));
  return v_flex()
    .flex_none()
    .mt(6)
    .rounded(8)
    .border_1()
    .border_color(panel.drag.over === group.state.name ? t.accent : t.background)
    .child(heading(panel, group, t))
    .children(rows);
}

// The figure is switched for every group by a click on any: estimate points (with the triangle) or issue count
/**
 * @param {Panel} panel
 * @param {Group} group
 * @param {Theme} t
 */
function heading(panel, group, t) {
  const counting = panel.totals === "count";
  const note = group.state.type === StateType.COMPLETED
    ? completedNote(panel.display.completed, panel.display.recency) : "";
  const figure = warming(panel, h_flex()
    .h(22)
    .px(5)
    .flex_none()
    .gap(3)
    .items_center()
    .rounded(5)
    .cursor_pointer(),
  `total-${group.state.id}`, t.muted, t.foreground);
  const arrow = warming(panel, div()
    .w(FOLD_BUTTON_WIDTH_PX)
    .h(FOLD_BUTTON_HEIGHT_PX)
    .flex_none()
    .flex()
    .items_center()
    .justify_center()
    .rounded(4)
    .cursor_pointer(),
  `fold-${group.state.id}`, t.dim, t.foreground);
  return h_flex()
    .h(30)
    .flex_none()
    .px(8)
    .gap(7)
    .items_center()
    .rounded(7)
    .text_size(13)
    .font_semibold()
    .text_color(t.foreground)
    .on_mouse_move((_e, cx) => panel.aim(group, cx))
    .on_mouse_up("left", (_e, cx) => panel.drop(group, cx))
    .child(panel.control(arrow, (cx) => panel.fold(group, cx))
      .child(svg(icon(panel.folded.has(group.state.name) ? "caret-right" : "caret-down"))
        .size(12)))
    .child(statusMark(group.state, panel.store.teams.get(group.issues[0]?.team.id ?? "")?.states))
    .child(div()
      .child(group.state.name))
    .child(panel.control(figure, (cx) => panel.switchTotals(cx))
      .when(!counting, (element) => element.child(svg(icon("estimate"))
        .size(14)))
      .child(String(counting ? group.issues.length : points(group.issues, panel.store.teams))))
    .child(div()
      .flex_1()
      .min_w(0)
      .truncate()
      .text_size(11)
      .font_normal()
      .text_color(t.dim)
      .child(note));
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
  const team = panel.store.teams.get(issue.team.id), estimate = estimateLabel(team, issue.estimate),
    ticked = selection.has(issue.id);
  // While a popup is open on an issue, that row alone is lit: the others do not answer the pointer
  const still = lit !== null;
  /**
   * @param {NativeElement} element
   * @param {Restyle} style
   */
  const hovers = (element, style) => (still ? element : element.hover(style));
  const { pressed } = drag;
  const carried = drag.carrying && pressed !== null && (pressed === issue.id || (ticked && selection.has(pressed)));
  const boxShows = ticked || (!still && panel.hovered === issue.id);
  const box = panel.hints.on(
    hovers(div()
      .id(`tick-${issue.id}`)
      .size(14)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded(3)
      .border_1()
      .border_color(ticked ? t.accent : t.input)
      .bg(ticked ? t.accent : t.background),
    (style) => style.border_color(t.accent))
      .when(!boxShows, (element) => element.invisible()),
    "Select issue", { caps: ["X"], key: `tick-${issue.id}` });
  const stateColor = drawnColor(issue.state.color);
  const status = warming(panel, div()
    .size(STATUS_BUTTON_PX)
    .mx((STATUS_SLOT_PX - STATUS_BUTTON_PX) / 2)
    .flex_none()
    .flex()
    .items_center()
    .justify_center(),
  `status-${issue.id}`, stateColor, brighten(stateColor, STATUS_HOVER_BRIGHTNESS), {
    still,
    tip: {
      label: "Change status", caps: propertyKey(Property.STATUS).caps, body: (t) => timeInStatus(panel, issue, t),
    },
    entered: (cx) => panel.loadStatusHistory(issue, cx),
  });
  const urgent = issue.priority === 1 && !isFinished(issue),
    plain = priorityColor(t, issue.priority, isFinished(issue));
  const urgency = warming(panel, div()
    .size(14)
    .flex_none()
    .flex()
    .items_center()
    .justify_center(),
  `priority-${issue.id}`, plain, urgent ? plain : t.foreground,
  { still, tip: { label: "Change priority", caps: propertyKey(Property.PRIORITY).caps } });
  const size = warming(panel, h_flex()
    .h(20)
    .pr(4)
    .gap(3)
    .flex_none()
    .items_center()
    .rounded(5)
    .text_size(11),
  `estimate-${issue.id}`, t.muted, t.foreground,
  { still, tip: { label: "Change estimate", caps: propertyKey(Property.ESTIMATE).caps } });
  const { cycle } = issue;
  const term = cycle && chip(panel, t, `cycle-${issue.id}`, {
    still,
    tip: { label: "", caps: [], body: (t) => cycleCard(panel, issue, cycle, t) },
    entered: (cx) => { if (Date.parse(cycle.startsAt) > Date.now()) panel.loadPlannedPoints(cycle, cx); },
  });
  const linked = merges(issue);
  const requests = linked.length > 0 && chip(panel, t, `merges-${issue.id}`, {
    still,
    tip: { label: "", caps: [], body: (t) => mergeCard(panel, issue, t) },
    entered: (cx) => panel.loadMergeDetails(issue, cx),
  });
  return h_flex()
    .id(`issue-${issue.id}`)
    .h(28)
    .flex_none()
    .px(8)
    .gap(8)
    .items_center()
    .cursor_pointer()
    .rounded_t(joined.above ? 0 : 7)
    .rounded_b(joined.below ? 0 : 7)
    .when(ticked, (element) => element.bg(withAlpha(t.accent, TICKED_ALPHA)))
    .when(lit === issue.id && !ticked, (element) => element.bg(t.hover))
    // One row is lit, the one the keys act on: the pointer and the arrow keys both move it (`hovered`)
    .when(!still && panel.hovered === issue.id,
      (element) => element.bg(ticked ? withAlpha(t.accent, TICKED_HOVER_ALPHA) : t.hover))
    .when(carried, (element) => element.opacity(CARRIED_OPACITY))
    .on_hover((hovered, cx) => panel.hover(issue, hovered, cx))
    .on_mouse_down("left", (event) => drag.press(issue.id, event.position))
    .on_mouse_move((_e, cx) => {
      panel.hover(issue, true, cx);
      panel.aim(group, cx);
    })
    .on_mouse_up("left", (event, cx) => panel.release(issue, group, cx, event))
    .on_mouse_down("right", (event, cx) => {
      cx.stop_propagation();
      panel.openers.openMenu(issue, event.position, event.bounds);
    })
    .child(panel.control(box, (cx, event) => panel.tick(issue, event.modifiers.shift, cx))
      .when(ticked, (element) => element.child(svg(shipped("check"))
        .size(10)
        .text_color(t.accent_foreground))))
    .child(panel.control(urgency, () => panel.openers.pick(issue, Property.PRIORITY))
      .child(svg(icon(priorityEntry(issue.priority).icon))
        .size(14)))
    .child(h_flex()
      .flex_none()
      .gap(2)
      .items_center()
      .child(div()
        .w(identifierWidth)
        .flex_none()
        .text_size(11)
        .text_color(t.dim)
        .child(issue.identifier))
      .child(panel.control(status, () => panel.openers.pick(issue, Property.STATUS))
        .child(svg(icon(statusIcon(issue.state, team?.states)))
          .size(14))))
    .child(div()
      .flex_1()
      .min_w(0)
      .truncate()
      .child(issue.title))
    .child(h_flex()
      .flex_none()
      .gap(3)
      .items_center()
      .children(requests ? [panel.control(requests, () => { for (const merge of linked) openLink(merge.url); })
        .on_mouse_down("right", (_e, cx) => cx.stop_propagation())
        .child(mergeMark(tinted(linked), ROW_MARK_PX))
        .child(chipLabel(linked))] : [])
      .children(term && cycle ? [panel.control(term, () => openCycle(issue, cycle))
        .on_mouse_down("right", (event, cx) => {
          cx.stop_propagation();
          panel.handle.focus();
          panel.openers.pick(issue, Property.CYCLE, event.bounds);
        })
        .child(cycleMark(tense(cycle, team?.cycles ?? [], Date.now()), ROW_MARK_PX))
        .child(String(cycle.number))] : [])
      .children(estimate === null ? [] : [panel.control(size, () => panel.openers.pick(issue, Property.ESTIMATE))
        .child(div()
          .w(ROW_MARK_PX)
          .flex_none()
          .flex()
          .justify_center()
          .child(svg(icon("estimate"))
            .size(ROW_MARK_PX)))
        .child(div()
          .w(estimateWidth)
          .flex_none()
          .text_center()
          .child(estimate))]));
}

// It sits beside the pointer, not under it: the group beneath must still get the release
/**
 * @param {Panel} panel
 * @param {Theme} t
 */
export function carried(panel, t) {
  const { selection } = panel, { pressed, ghost } = panel.drag;
  // Both are set while an issue is carried, which is when this is drawn
  if (pressed === null || ghost === null) return div();
  const issue = panel.store.index()
    .get(pressed);
  if (!issue) return div();
  const others = selection.has(pressed) ? selection.size - 1 : 0;
  // The pointer's place comes in window pixels
  const scale = zoom();
  return h_flex()
    .absolute()
    .left(ghost.x / scale + GHOST_OFFSET_X_PX)
    .top(ghost.y / scale + GHOST_OFFSET_Y_PX)
    .h(30)
    .max_w(GHOST_MAX_WIDTH_PX)
    .px(9)
    .gap(8)
    .items_center()
    .rounded(8)
    .bg(t.popover)
    .border_1()
    .border_color(t.accent)
    .shadow_md()
    .text_size(13)
    .child(priorityMark(t, issue.priority, isFinished(issue)))
    .child(div()
      .flex_none()
      .text_size(11)
      .text_color(t.dim)
      .child(issue.identifier))
    .child(div()
      .min_w(0)
      .truncate()
      .child(issue.title))
    .when(others > 0, (element) => element.child(div()
      .flex_none()
      .px(5)
      .rounded(8)
      .bg(t.accent)
      .text_size(11)
      .text_color(t.accent_foreground)
      .child(`+${others}`)));
}

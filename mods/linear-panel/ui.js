// Small pieces of the mod's look and feel, shared by its parts.
import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { settings } from "herdr";
import { icon } from "./config.js";
import { drawnColor, isMac } from "./tracker.js";
import { cycleIcon } from "./lib/cycles.js";
import { statusIcon } from "./lib/teams.js";

const URGENT = "#f2793a";
export const CYCLE_BLUE = "#5e6ad2";

// How many window pixels one pixel of a style takes: the person's zoom. Herdr scales every length a mod gives it,
// and tells where the pointer and an element are in window pixels: a place read from an event is divided by this
// before it is given back as a length, and a length is multiplied by it before it is compared with such a place.
export const zoom = () => Number(settings().zoom) || 1;

/**
 * @param {Theme} t
 * @param {string[]} keys
 */
export const keycaps = (t, keys) => h_flex().flex_none().gap(3).items_center().children(keys.map((key) =>
  div().min_w(20).h(20).px(5).flex_none().flex().items_center().justify_center()
    .rounded(5).border_1().border_color(t.border).bg(t.raised).text_size(11).text_color(t.muted).child(key)));

// The keys of a shortcut under the command key: Cmd on macOS; Ctrl elsewhere, where Option is Alt.
/** @param {string[]} keys */
export const chordCaps = (keys) =>
  (isMac() ? ["⌘", ...keys] : ["Ctrl", ...keys.map((key) => (key === "⌥" ? "Alt" : key))]);

// Urgent is orange until the issue is finished.
/**
 * @param {Theme} t
 * @param {number} priority
 * @param {boolean} finished
 * @returns {Color}
 */
export const priorityColor = (t, priority, finished) => (priority === 1 && !finished ? URGENT : t.muted);

// A priority's mark (icons/priority-0.svg to priority-4.svg).
/**
 * @param {Theme} t
 * @param {number} priority
 * @param {boolean} finished
 */
export const priorityMark = (t, priority, finished) =>
  svg(icon(`priority-${priority || 0}`)).size(14).flex_none().text_color(priorityColor(t, priority, finished));

// `states`, the states of its team, set how full a started state's pie is.
/**
 * @param {WorkflowState} state
 * @param {WorkflowState[]} [states]
 */
export const statusMark = (state, states) => svg(icon(statusIcon(state, states))).size(14).flex_none()
  .text_color(drawnColor(state.color));

// A cycle's icon where it stands (lib/cycles.js): indigo for the current one, else `color`, or without
// one the color around it.
/**
 * @param {CycleTense} tense
 * @param {number} size
 * @param {Color} [color]
 */
export function cycleMark(tense, size, color) {
  const mark = svg(icon(cycleIcon(tense))).size(size).flex_none(), tint = tense === "current" ? CYCLE_BLUE : color;
  return tint ? mark.text_color(tint) : mark;
}

// One of the mod's icons at the size menus use.
/**
 * @param {Theme} t
 * @param {string} name
 */
export const glyph = (t, name) => svg(icon(name)).size(15).text_color(t.muted);

// Gives the keyboard to a popup that just opened. Asked twice: the second call is for a popup that was not ready
// for the first.
/**
 * @param {{ focus(): void }} target
 * @param {Context} cx
 */
export function takeKeyboard(target, cx) {
  target.focus();
  cx.timer.after(100, () => target.focus());
}

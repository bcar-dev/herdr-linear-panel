// Small pieces of the mod's look and feel, shared by its parts
import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { settings } from "herdr";
import { NEUTRAL_GREY, icon, priorityEntry, shipped } from "./config.js";
import { drawnColor, isMac } from "./tracker.js";
import { mix } from "./lib/color.js";
import { CycleTense, cycleIcon } from "./lib/cycles.js";
import { MergeStanding, MergeTint } from "./lib/merges.js";
import { statusIcon } from "./lib/teams.js";

export const CYCLE_BLUE = "#5e6ad2";
const EMOJI = /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\u200d|\ufe0f)+$/u;
const EMOJI_TEXT_RATIO = 0.85;
export const FACE_SIZE_PX = 18;
// When Herdr hands the keyboard around (a popup closing, a field showing), a focus asked once may be lost: it is asked
// again after each of these delays
const FOCUS_RETRY_MS = [30, 120, 250, 500];
export const GLYPH_SIZE_PX = 15;
const INITIALS_TEXT_RATIO = 0.45;
const KEYBOARD_RETAKE_DELAY_MS = 100;
export const KEYCAP_GAP_PX = 3;
const KEYCAP_HEIGHT_PX = 20;
const KEYCAP_LIT_WHITE_MIX = 0.22;
export const KEYCAP_MIN_WIDTH_PX = 20;
const KEYCAP_RADIUS_PX = 5;
export const KEYCAP_SIDE_PADDING_PX = 5;
const KEYCAP_TEXT_SIZE_PX = 11;
const URGENT_ORANGE = "#f2793a";
const WHITE = "#ffffff";

// How many window pixels one pixel of a style takes: the person's zoom. Herdr scales every length a mod gives it,
// and tells where the pointer and an element are in window pixels: a place read from an event is divided by this
// before it is given back as a length, and a length is multiplied by it before it is compared with such a place
export const zoom = () => Number(settings().zoom) || 1;

/**
 * @param {Theme} theme
 * @param {string[]} keys
 * @param {(key: string) => boolean} [lit] whether a key is held down now: it is drawn brighter
 */
export const keycaps = (theme, keys, lit = () => false) => h_flex()
  .flex_none()
  .gap(KEYCAP_GAP_PX)
  .items_center()
  .children(keys.map((key) => div()
    .min_w(KEYCAP_MIN_WIDTH_PX)
    .h(KEYCAP_HEIGHT_PX)
    .px(KEYCAP_SIDE_PADDING_PX)
    .flex_none()
    .flex()
    .items_center()
    .justify_center()
    .rounded(KEYCAP_RADIUS_PX)
    .border_1()
    .border_color(theme.border)
    .bg(lit(key) ? mix(theme.raised, WHITE, KEYCAP_LIT_WHITE_MIX) : theme.raised)
    .text_size(KEYCAP_TEXT_SIZE_PX)
    .text_color(lit(key) ? theme.foreground : theme.muted)
    .child(key)));

/** @param {string[]} keys */
export const chordCaps = (keys) =>
  (isMac() ? ["⌘", ...keys] : ["Ctrl", ...keys.map((key) => (key === "⌥" ? "Alt" : key))]);

/**
 * @param {Theme} theme
 * @param {number} priority
 * @param {boolean} finished
 * @returns {Color}
 */
export const priorityColor = (theme, priority, finished) => (priority === 1 && !finished ? URGENT_ORANGE : theme.muted);

/**
 * @param {Theme} theme
 * @param {number} priority
 * @param {boolean} finished
 */
export const priorityMark = (theme, priority, finished) =>
  svg(icon(priorityEntry(priority).icon))
    .size(14)
    .flex_none()
    .text_color(priorityColor(theme, priority, finished));

// `states`, the states of its team, set how full a started state's pie is
/**
 * @param {WorkflowState} state
 * @param {WorkflowState[]} [states]
 */
export const statusMark = (state, states) => svg(icon(statusIcon(state, states)))
  .size(14)
  .flex_none()
  .text_color(drawnColor(state.color));

/**
 * @param {CycleTense} tense
 * @param {number} size
 * @param {Color} [color]
 */
export function cycleMark(tense, size, color) {
  const mark = svg(icon(cycleIcon(tense)))
    .size(size)
    .flex_none();
  const tint = tense === CycleTense.CURRENT ? CYCLE_BLUE : color;
  return tint ? mark.text_color(tint) : mark;
}

/** @type {Record<MergeStanding, Color>} */
export const MERGE_COLORS = {
  [MergeStanding.CLOSED]: "#eb5757", [MergeStanding.DRAFT]: NEUTRAL_GREY, [MergeStanding.MERGED]: CYCLE_BLUE,
  [MergeStanding.OPEN]: "#4cb782",
};

/**
 * @param {MergeTint} tint
 * @param {number} size
 */
export function mergeMark(tint, size) {
  const glyphOf = tint === MergeTint.DRAFT ? "git-pull-request-draft" : "git-pull-request";
  const mark = () => svg(icon(glyphOf))
    .size(size)
    .flex_none();
  if (tint !== MergeTint.MIXED) return mark()
    .text_color(MERGE_COLORS[tint]);
  const half = size / 2;
  return h_flex()
    .w(size)
    .h(size)
    .flex_none()
    .child(div()
      .w(half)
      .h(size)
      .overflow_hidden()
      .child(mark()
        .text_color(MERGE_COLORS[MergeStanding.MERGED])))
    .child(div()
      .w(half)
      .h(size)
      .overflow_hidden()
      .child(mark()
        .ml(-half)
        .text_color(MERGE_COLORS[MergeStanding.OPEN])));
}

// A mod cannot show a picture from an address
/**
 * @param {string} initials
 * @param {Color} color
 * @param {number} [size]
 */
export const face = (initials, color, size = FACE_SIZE_PX) => div()
  .size(size)
  .flex_none()
  .flex()
  .items_center()
  .justify_center()
  .rounded(size / 2)
  .bg(color)
  .text_size(size * INITIALS_TEXT_RATIO)
  .text_color(WHITE)
  .child(initials);

/**
 * @param {Theme} theme
 * @param {string} id
 * @param {number} height
 * @param {{ px?: number, gap?: number, lit?: boolean }} [options] `lit` false leaves it as it is under the pointer
 */
export const pillRow = (theme, id, height, { px = 10, gap = 9, lit = true } = {}) => h_flex()
  .id(id)
  .h(height)
  .flex_none()
  .px(px)
  .gap(gap)
  .items_center()
  .rounded(height / 2)
  .cursor_pointer()
  .when(lit, (row) => row.hover((style) => style.bg(theme.hover)));

/**
 * @param {string} id
 * @param {number} size
 */
export const roundButton = (id, size) => div()
  .id(id)
  .size(size)
  .flex_none()
  .flex()
  .items_center()
  .justify_center()
  .rounded(size / 2)
  .cursor_pointer();

/** @param {{ color: Color, isGroup?: boolean }} label */
export const labelMark = (label) => (label.isGroup
  ? svg(icon("label-group"))
    .size(14)
    .flex_none()
    .text_color(label.color)
  : div()
    .size(9)
    .flex_none()
    .rounded(5)
    .bg(label.color));

/** @param {Theme} theme */
export const chevron = (theme) => svg(shipped("chevron-right"))
  .size(12)
  .flex_none()
  .text_color(theme.dim);

/**
 * @param {Theme} theme
 * @param {boolean} on
 */
export const lit = (theme, on) => (on ? theme.foreground : theme.muted);

// The tracker's other icons come as names of its own set, and a workspace's custom emoji as a picture: neither can
// be drawn from the API
/**
 * @param {{ name: string, icon: string | null, color: Color | null }} team
 * @param {number} size
 */
export function teamMark(team, size) {
  if (team.icon && EMOJI.test(team.icon)) {
    return div()
      .size(size)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .text_size(size * EMOJI_TEXT_RATIO)
      .child(team.icon);
  }
  return face(team.name.slice(0, 1)
    .toUpperCase(), drawnColor(team.color), size);
}

/**
 * @param {Theme} theme
 * @param {string} name
 */
export const glyph = (theme, name) => svg(icon(name))
  .size(GLYPH_SIZE_PX)
  .text_color(theme.muted);

// Asked again after the delay of `FOCUS_RETRY_MS`, as many of them as `retries` says: `focus` is run each time
/**
 * @param {Context} context
 * @param {() => void} focus
 * @param {number} [retries]
 */
export function focusSoon(context, focus, retries = FOCUS_RETRY_MS.length) {
  for (const wait of FOCUS_RETRY_MS.slice(0, retries)) context.timer.after(wait, focus);
}

// Asked twice: the second call is for a popup that was not ready for the first
/**
 * @param {{ focus(): void }} target
 * @param {Context} context
 */
export function takeKeyboard(target, context) {
  target.focus();
  context.timer.after(KEYBOARD_RETAKE_DELAY_MS, () => target.focus());
}

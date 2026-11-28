// What the mod's menus are drawn from: the frame, its rows, captions and rules
import { div, svg } from "gpui-kit";
import { v_flex, h_flex, Input } from "gpui-base";
import { MENU_ROW_HEIGHT_PX, shipped } from "../config.js";
import { chevron, keycaps, pillRow } from "../ui.js";

// The frame's padding and border, above and below
export const FRAME_PADDING_PX = 12;
export const MENU_ROW_RADIUS_PX = 6;
const SEARCH_ROW_HEIGHT_PX = 34;
const SEARCH_TEXT_SIZE_PX = 12.8;

// The box around a popup. The mod draws it: Herdr's own has corners that cannot be made rounder
/**
 * @param {Theme} t
 * @param {NativeElement} element
 */
export const boxed = (t, element) => element.rounded(10)
  .border_1()
  .border_color(t.border)
  .bg(t.popover)
  .shadow_lg();

/**
 * @param {Theme} t
 * @param {string} id
 * @param {FocusHandle} handle
 */
export const frame = (t, id, handle) =>
  boxed(t, v_flex()
    .id(id)
    .track_focus(handle)
    .w_full()
    .min_h(0)
    .p(5)
    .text_size(12.8));

/**
 * @param {Theme} t
 * @param {string} id
 * @param {NativeElement[]} label
 * @param {OnClick} action
 * @param {boolean} [ticked]
 */
export const item = (t, id, label, action, ticked) =>
  pillRow(t, `item-${id}`, MENU_ROW_HEIGHT_PX)
    .rounded(MENU_ROW_RADIUS_PX)
    .text_color(t.foreground)
    .on_click(action)
    .child(h_flex()
      .flex_1()
      .min_w(0)
      .gap(8)
      .items_center()
      .children(label))
    .when(Boolean(ticked), (element) => element.child(svg(shipped("check"))
      .size(13)
      .flex_none()
      .text_color(t.muted)));

// A menu that passes `lit` decides which row is lit: the row then has no hover light of its own
/**
 * @param {Theme} t
 * @param {string} id
 * @param {NativeElement} icon
 * @param {string} label
 * @param {{ caps?: string[] | null, arrow?: boolean, lit?: boolean }} options
 */
export const entry = (t, id, icon, label, { caps, arrow, lit } = {}) =>
  pillRow(t, `entry-${id}`, MENU_ROW_HEIGHT_PX, { lit: lit === undefined })
    .rounded(MENU_ROW_RADIUS_PX)
    .text_color(t.foreground)
    .when(Boolean(lit), (element) => element.bg(t.selected))
    .child(div()
      .w(16)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .child(icon))
    .child(div()
      .flex_1()
      .min_w(0)
      .truncate()
      .child(label))
    .children(caps ? [keycaps(t, caps)] : [])
    .when(Boolean(arrow), (element) => element.child(chevron(t)));

/**
 * @param {Theme} t
 * @param {string} text
 */
export const caption = (t, text) => div()
  .px(8)
  .pt(4)
  .pb(6)
  .flex_none()
  .truncate()
  .text_size(11)
  .text_color(t.dim)
  .child(text);

/** @param {Theme} t */
export const rule = (t) => div()
  .mx(7)
  .my(4)
  .h(1)
  .flex_none()
  .bg(t.border);

// The field a popup is searched with, as wide as its line
/**
 * @param {Theme} t
 * @param {import("gpui-base").InputState} input
 * @param {number} [size] the text's
 */
export const searchField = (t, input, size = SEARCH_TEXT_SIZE_PX) =>
  Input.new(input)
    .flex_1()
    .h_full()
    .text_size(size)
    .text_color(t.foreground);

// The line of a popup that has a field, and the keys that open the popup after it
/**
 * @param {Theme} t
 * @param {import("gpui-base").InputState} input
 * @param {string[]} [caps]
 */
export const searchRow = (t, input, caps) => h_flex()
  .h(SEARCH_ROW_HEIGHT_PX)
  .flex_none()
  .px(8)
  .items_center()
  .child(searchField(t, input))
  .children(caps ? [keycaps(t, caps)] : []);

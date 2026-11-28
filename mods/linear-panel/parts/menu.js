// What the mod's menus are drawn from: the frame, its rows, captions and rules
import { div, svg } from "gpui-kit";
import { v_flex, h_flex, Input } from "gpui-base";
import { shipped } from "../config.js";
import { chevron, keycaps, pillRow } from "../ui.js";
import { Height, Radius, Space, Text } from "../style.js";

// The frame's padding and border, above and below
export const FRAME_PADDING_PX = 12;
const SEARCH_ROW_HEIGHT_PX = 34;

// The box around a popup. The mod draws it: Herdr's own has corners that cannot be made rounder
/**
 * @param {Theme} theme
 * @param {NativeElement} element
 */
export const boxed = (theme, element) => element.rounded(Radius.BOX)
  .border_1()
  .border_color(theme.border)
  .bg(theme.popover)
  .shadow_lg();

/**
 * @param {Theme} theme
 * @param {string} id
 * @param {FocusHandle} handle
 */
export const frame = (theme, id, handle) =>
  boxed(theme, v_flex()
    .id(id)
    .track_focus(handle)
    .w_full()
    .min_h(0)
    .p(5)
    .text_size(Text.BODY));

/**
 * @param {Theme} theme
 * @param {string} id
 * @param {NativeElement[]} label
 * @param {OnClick} action
 * @param {boolean} [ticked]
 */
export const item = (theme, id, label, action, ticked) =>
  pillRow(theme, `item-${id}`, Height.MENU_ROW)
    .rounded(Radius.ROW)
    .text_color(theme.foreground)
    .on_click(action)
    .child(h_flex()
      .flex_1()
      .min_w(0)
      .gap(Space.M)
      .items_center()
      .children(label))
    .when(Boolean(ticked), (element) => element.child(svg(shipped("check"))
      .size(13)
      .flex_none()
      .text_color(theme.muted)));

// A menu that passes `lit` decides which row is lit: the row then has no hover light of its own
/**
 * @param {Theme} theme
 * @param {string} id
 * @param {NativeElement} icon
 * @param {string} label
 * @param {{ caps?: string[] | null, arrow?: boolean, lit?: boolean }} options
 */
export const entry = (theme, id, icon, label, { caps, arrow, lit } = {}) =>
  pillRow(theme, `entry-${id}`, Height.MENU_ROW, { lit: lit === undefined })
    .rounded(Radius.ROW)
    .text_color(theme.foreground)
    .when(Boolean(lit), (element) => element.bg(theme.selected))
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
    .children(caps ? [keycaps(theme, caps)] : [])
    .when(Boolean(arrow), (element) => element.child(chevron(theme)));

/**
 * @param {Theme} theme
 * @param {string} text
 */
export const caption = (theme, text) => div()
  .px(8)
  .pt(4)
  .pb(6)
  .flex_none()
  .truncate()
  .text_size(Text.CAPTION)
  .text_color(theme.dim)
  .child(text);

/** @param {Theme} theme */
export const rule = (theme) => div()
  .mx(7)
  .my(4)
  .h(1)
  .flex_none()
  .bg(theme.border);

// The field a popup is searched with, as wide as its line
/**
 * @param {Theme} theme
 * @param {import("gpui-base").InputState} input
 * @param {number} [size] the text's
 */
export const searchField = (theme, input, size = Text.BODY) =>
  Input.new(input)
    .flex_1()
    .h_full()
    .text_size(size)
    .text_color(theme.foreground);

// The line of a popup that has a field, and the keys that open the popup after it
/**
 * @param {Theme} theme
 * @param {import("gpui-base").InputState} input
 * @param {string[]} [caps]
 */
export const searchRow = (theme, input, caps) => h_flex()
  .h(SEARCH_ROW_HEIGHT_PX)
  .flex_none()
  .px(8)
  .items_center()
  .child(searchField(theme, input))
  .children(caps ? [keycaps(theme, caps)] : []);

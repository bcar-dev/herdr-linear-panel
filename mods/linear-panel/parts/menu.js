// What the mod's menus are drawn from: the frame, its rows, captions and rules.
import { div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { MENU_ROW, shipped } from "../config.js";
import { keycaps } from "../ui.js";

// The box around a popup. The mod draws it: Herdr's own has corners that cannot be made rounder.
/**
 * @param {Theme} t
 * @param {NativeElement} el
 */
export const boxed = (t, el) => el.rounded(10).border_1().border_color(t.border).bg(t.popover).shadow_lg();

// The body of a menu popup. `handle` gives it the keyboard.
/**
 * @param {Theme} t
 * @param {string} id
 * @param {FocusHandle} handle
 */
export const frame = (t, id, handle) =>
  boxed(t, v_flex().id(id).track_focus(handle).w_full().min_h(0).p(5).text_size(12.8));

/**
 * @param {Theme} t
 * @param {string} id
 * @param {NativeElement[]} label
 * @param {OnClick} action
 * @param {boolean} [ticked]
 */
export const item = (t, id, label, action, ticked) =>
  h_flex().id(`item-${id}`).h(MENU_ROW).flex_none().px(8).gap(9).items_center().rounded(7).text_color(t.foreground)
    .hover((s) => s.bg(t.hover))
    .on_click(action)
    .child(h_flex().flex_1().min_w(0).gap(8).items_center().children(label))
    .when(Boolean(ticked), (el) => el.child(svg(shipped("check")).size(13).flex_none().text_color(t.muted)));

// `lit` keeps the row highlighted while the page it opens shows.
/**
 * @param {Theme} t
 * @param {string} id
 * @param {NativeElement} icon
 * @param {string} label
 * @param {{ caps?: string[] | null, arrow?: boolean, lit?: boolean }} options
 */
export const entry = (t, id, icon, label, { caps, arrow, lit } = {}) =>
  h_flex().id(`entry-${id}`).h(MENU_ROW).flex_none().px(8).gap(9).items_center().rounded(7).cursor_pointer()
    .text_color(t.foreground)
    .when(Boolean(lit), (el) => el.bg(t.selected))
    .hover((s) => s.bg(t.hover))
    .child(div().w(16).flex_none().flex().items_center().justify_center().child(icon))
    .child(div().flex_1().min_w(0).truncate().child(label))
    .children(caps ? [keycaps(t, caps)] : [])
    .when(Boolean(arrow), (el) => el.child(svg(shipped("chevron-right")).size(12).flex_none().text_color(t.dim)));

/**
 * @param {Theme} t
 * @param {string} text
 */
export const caption = (t, text) => div().px(8).pt(4).pb(6).flex_none().truncate().text_size(11).text_color(t.dim)
  .child(text);

/** @param {Theme} t */
export const rule = (t) => div().mx(7).my(4).h(1).flex_none().bg(t.border);

// Tooltips of the panel's own, since Herdr's are text only: a control's name and its shortcut as keys.
import { div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { keycaps, zoom } from "../ui.js";
import { tipSpot, unzoomed } from "../lib/placement.js";

// How long the pointer rests on a control before its tooltip shows, in ms.
const REST = 1000;
// How long after a tooltip went the next control shows its own at once, in ms.
const WARM = 500;

export class Hints {
  /** @type {Tip | null} */
  tip = null;
  // The tooltip of the control the pointer is on, until the pointer has rested there long enough to show it.
  /** @type {Tip | null} */
  #waiting = null;
  // The keys of the controls given a tooltip in the drawing under way.
  /** @type {Set<string>} */
  #drawn = new Set();
  // Until when a control the pointer comes on shows its tooltip without the rest: a tooltip went a moment ago.
  #warmUntil = 0;

  begin() { this.#drawn = new Set(); }

  // The tooltip to show, once every control of the drawing has been given its own. A tooltip does not outlive its
  // control: a control that went away while the pointer was on it is never told the pointer left.
  showing() {
    if (this.tip && !this.#drawn.has(this.tip.key)) this.tip = null;
    if (this.#waiting && !this.#drawn.has(this.#waiting.key)) this.#waiting = null;
    return this.tip;
  }

  // Gives an element a tooltip, shown under it (or with side "above", over it) once the pointer has rested on it: its
  // `label`, then the keys of its shortcut (`caps`). The element needs an id. `key` tells the controls apart: give
  // one when several share a label. `body(t)` draws more above the label, or answers null for nothing.
  // An element takes one hover handler, and the tooltip needs it: `hover` is run from it, for the element's own use.
  /**
   * @param {NativeElement} el
   * @param {string} label
   * @param {{
   *   caps?: string[], side?: Tip["side"], key?: string, body?: Tip["body"],
   *   hover?: (hovered: boolean, cx: Context) => void,
   * }} options
   */
  on(el, label, { caps = [], side = "below", key = label, body, hover } = {}) {
    this.#drawn.add(key);
    return el
      .on_mouse_move((e, cx) => {
        if (this.tip?.key === key || this.#waiting?.key === key) return;
        const tip = { key, label, caps, side, body, bounds: e.bounds };
        // From one control to its neighbor, the pointer does not rest again: two issues can be compared at once.
        if (this.tip || Date.now() < this.#warmUntil) {
          this.#waiting = null;
          this.tip = tip;
          cx.notify();
          return;
        }
        this.#waiting = tip;
        cx.timer.after(REST, (cx) => {
          // Still the same visit of the pointer: it has not left, nor left and come back.
          if (this.#waiting !== tip) return;
          this.#waiting = null;
          this.tip = tip;
          cx.notify();
        });
      })
      .on_hover((hovered, cx) => {
        hover?.(hovered, cx);
        if (hovered) return;
        if (this.#waiting?.key === key) this.#waiting = null;
        if (this.tip?.key !== key) return;
        this.tip = null;
        this.#warmUntil = Date.now() + WARM;
        cx.notify();
      });
  }

  clear() { this.tip = this.#waiting = null; }

  // The tooltip, drawn inside the panel since a mod cannot draw outside its block. `frame` is the panel's bounds.
  /**
   * @param {Theme} t
   * @param {Bounds} frame
   */
  draw(t, frame) {
    // There is one: the panel draws it only when `showing` answered it.
    const { label, caps, side, bounds, body } = /** @type {Tip} */ (this.tip);
    const card = body?.(t) ?? null;
    // Under a body, the label and its keys take the two ends of their line.
    const line = h_flex().h(26).flex_none().gap(8).items_center()
      .child(div().flex_none().child(label))
      .when(card !== null, (el) => el.child(div().flex_1()))
      .when(caps.length > 0, (el) => el.child(keycaps(t, caps)));
    const box = v_flex().px(9).flex_none().rounded(8)
      .bg(t.popover).border_1().border_color(t.border).shadow_md().text_size(12).text_color(t.foreground)
      .children(card ? [card.el, div().h(1).flex_none().bg(t.border)] : [])
      .child(line);
    // A mod cannot measure text: the label's line is reckoned at 6.3 px a character, a key at 20 px or more.
    const lineWidth = 6.3 * label.length +
      caps.reduce((sum, cap) => sum + 3 + Math.max(20, 10 + 7 * cap.length), caps.length ? 5 : 0);
    // With the padding and the border; under a body, with its rule too.
    const size = { width: Math.max(lineWidth, card?.width ?? 0) + 20, height: (card ? card.height + 1 : 0) + 28 };
    // The control and the panel are known in window pixels; the tooltip is placed in the pixels of a style.
    const scale = zoom(), within = unzoomed(frame, scale);
    const { left, right, center, top, bottom } = tipSpot(unzoomed(bounds, scale), within, side, size);
    // Centered, the tooltip sits in the middle of a row that reaches as far on each side of the control's middle as
    // the nearer edge of the panel: its own width, which is only reckoned, does not shift it.
    const reach = Math.min(center ?? 0, within.width - (center ?? 0));
    const across = center !== undefined ? h_flex().absolute().left(center - reach).w(2 * reach).justify_center()
      .child(box)
      : left !== undefined ? box.absolute().left(left)
        : box.absolute().right(right);
    const placed = across.id("tooltip");
    return top === undefined ? placed.bottom(bottom) : placed.top(top);
  }
}

// Tooltips of the panel's own, since Herdr's are text only: a control's name and its shortcut as keys
import { div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { Side } from "../enums.js";
import { isMac } from "../tracker.js";
import { KEYCAP_MIN_WIDTH_PX, KEYCAP_SIDE_PADDING_PX, keycaps, zoom } from "../ui.js";
import { capHeld } from "../lib/keys.js";
import { textWidth, tipSpot, unzoomed } from "../lib/placement.js";
import { Radius, Space, Text } from "../style.js";

const KEYCAPS_LEAD_PX = 5;
const KEYCAP_CHAR_WIDTH_PX = 7;
const KEYCAP_PADDING_PX = 2 * KEYCAP_SIDE_PADDING_PX;
const LABEL_CHAR_WIDTH_PX = 6.3;
const TOOLTIP_DELAY_MS = 1000;
const TOOLTIP_FRAME_HEIGHT_PX = 28;
const TOOLTIP_FRAME_WIDTH_PX = 20;
const TOOLTIP_WARM_MS = 500;

/** @type {(keyof KeyEvent["modifiers"])[]} */
const MODIFIER_NAMES = ["shift", "control", "alt", "platform", "function"];
const NOTHING_HELD = Object.freeze({
  modifiers: Object.freeze({ shift: false, control: false, alt: false, platform: false, function: false }), key: null,
});

export class Hints {
  /** @type {Tip | null} */
  tip = null;
  /** @type {Tip | null} */
  #waiting = null;
  // The keys of the controls given a tooltip in the drawing under way
  /** @type {Set<string>} */
  #drawn = new Set();
  // Until when a control the pointer comes on shows its tooltip without the rest
  #warmUntil = 0;
  /** @type {string | null} */
  #hovered = null;
  /** @type {string | null} */
  #pressed = null;

  // `covered()` says whether something is open over the panel (a popup): the pointer is then taken from the controls
  // beneath it, which are told it left without its having left them, and a pressed control stays pressed
  /** @param {() => boolean} [covered] */
  constructor(covered = () => false) { this.#covered = covered; }
  #covered;

  begin() { this.#drawn = new Set(); }

  /** @type {{ modifiers: KeyEvent["modifiers"], key: string | null }} */
  held = NOTHING_HELD;

  forgetKeys() {
    this.held = NOTHING_HELD;
  }

  // The panel never hears the keys let go while a popup has the keyboard. A pointer move tells the modifiers down,
  // so they are read again, and any other key counts as let go
  /**
   * @param {KeyEvent["modifiers"]} modifiers
   * @param {Context} context
   */
  pointerMoved(modifiers, context) {
    const { held } = this;
    if (held.key === null && MODIFIER_NAMES.every((name) => held.modifiers[name] === modifiers[name])) return;
    this.keys(modifiers, null, context);
  }

  /**
   * @param {KeyEvent["modifiers"]} modifiers
   * @param {string | null} key the key that went down, null when it went up or only a modifier changed
   * @param {Context} context
   */
  keys(modifiers, key, context) {
    this.held = { modifiers, key };
    if (this.tip?.caps.length) context.notify();
  }

  // A control that went away while the pointer was on it is never told the pointer left
  showing() {
    if (this.tip && !this.#drawn.has(this.tip.key)) this.tip = null;
    if (this.#waiting && !this.#drawn.has(this.#waiting.key)) this.#waiting = null;
    return this.tip;
  }

  // The element needs an id. `key` tells the controls apart: give one when several share a label. `body(theme)` draws
  // more above the label, or answers null for nothing. Under a body, an empty label leaves the tooltip to the body
  // alone. An element takes one hover handler, and the tooltip needs it: `hover` is run from it, for the element's own
  // use
  /**
   * @param {NativeElement} element
   * @param {string} label
   * @param {{
   *   caps?: string[], side?: Tip["side"], key?: string, body?: Tip["body"],
   *   hover?: (hovered: boolean, context: Context) => void,
   * }} options
   */
  on(element, label, { caps = [], side = Side.BELOW, key = label, body, hover } = {}) {
    this.#drawn.add(key);
    return element
      .on_mouse_down("left", (_event, context) => this.#press(key, context))
      .on_mouse_move((event, context) => {
        if (this.#pressed === key || this.tip?.key === key || this.#waiting?.key === key) return;
        const tip = { key, label, caps, side, body, bounds: event.bounds };
        if (this.tip || Date.now() < this.#warmUntil) {
          this.#waiting = null;
          this.tip = tip;
          context.notify();
          return;
        }
        this.#waiting = tip;
        context.timer.after(TOOLTIP_DELAY_MS, (context) => {
          // Still the same visit of the pointer: it has not left, nor left and come back
          if (this.#waiting !== tip) return;
          this.#waiting = null;
          this.tip = tip;
          context.notify();
        });
      })
      .on_hover((hovered, context) => {
        hover?.(hovered, context);
        if (hovered) { this.#hovered = key; return; }
        if (this.#hovered === key) this.#hovered = null;
        if (this.#pressed === key && !this.#covered()) this.#pressed = null;
        if (this.#waiting?.key === key) this.#waiting = null;
        if (this.tip?.key !== key) return;
        this.tip = null;
        this.#warmUntil = Date.now() + TOOLTIP_WARM_MS;
        context.notify();
      });
  }

  /**
   * @param {string} key
   * @param {Context} context
   */
  #press(key, context) {
    this.#pressed = key;
    this.#waiting = null;
    this.#warmUntil = 0;
    if (this.tip) { this.tip = null; context.notify(); }
  }

  // A control gives this to its own press handler, since that one stops the press and the tooltip's own never sees it
  /** @param {Context} context */
  press(context) {
    if (this.#hovered) this.#press(this.#hovered, context);
  }

  clear() {
    this.tip = this.#waiting = null;
    this.#warmUntil = 0;
  }

  // Drawn inside the panel: a mod cannot draw outside its block. `frame` is the panel's bounds
  /**
   * @param {Theme} theme
   * @param {Bounds} frame
   */
  draw(theme, frame) {
    // There is one: the panel draws it only when `showing` answered it
    const { label, caps, side, bounds, body } = /** @type {Tip} */ (this.tip);
    const card = body?.(theme) ?? null, lined = !card || label !== "";
    const line = h_flex()
      .h(26)
      .flex_none()
      .gap(Space.M)
      .items_center()
      .child(div()
        .flex_none()
        .child(label))
      .when(card !== null, (element) => element.child(div()
        .flex_1()))
      .when(caps.length > 0,
        (element) => element.child(keycaps(theme, caps, (cap) => capHeld(cap, this.held, isMac()))));
    const box = v_flex()
      .px(9)
      .flex_none()
      .rounded(Radius.CARD)
      .bg(theme.popover)
      .border_1()
      .border_color(theme.border)
      .shadow_md()
      .text_size(Text.SMALL)
      .text_color(theme.foreground)
      .children(card ? [card.element] : [])
      .children(lined ? [...(card ? [div()
        .h(1)
        .flex_none()
        .bg(theme.border)] : []), line] : []);
    const lineWidth = textWidth(label, LABEL_CHAR_WIDTH_PX) + caps.reduce(
      (sum, cap) => sum + Space.XS +
        Math.max(KEYCAP_MIN_WIDTH_PX, KEYCAP_PADDING_PX + textWidth(cap, KEYCAP_CHAR_WIDTH_PX)),
      caps.length ? KEYCAPS_LEAD_PX : 0);
    // With the padding and the border; under a body, with its rule too
    const size = { width: Math.max(lineWidth, card?.width ?? 0) + TOOLTIP_FRAME_WIDTH_PX,
      height: (card ? card.height + (lined ? 1 : 0) : 0) + (lined ? TOOLTIP_FRAME_HEIGHT_PX : 2) };
    // The control and the panel are known in window pixels; the tooltip is placed in the pixels of a style
    const scale = zoom(), within = unzoomed(frame, scale);
    const { left, right, center, top, bottom } = tipSpot(unzoomed(bounds, scale), within, side, size);
    // Centered, the tooltip sits in the middle of a row that reaches as far on each side of the control's middle as
    // the nearer edge of the panel: its own width, which is only reckoned, does not shift it
    const reach = Math.min(center ?? 0, within.width - (center ?? 0));
    const across = center !== undefined ? h_flex()
      .absolute()
      .left(center - reach)
      .w(2 * reach)
      .justify_center()
      .child(box)
      : left !== undefined ? box.absolute()
        .left(left)
      : box.absolute()
        .right(right);
    const placed = across.id("tooltip");
    return top === undefined ? placed.bottom(bottom) : placed.top(top);
  }
}

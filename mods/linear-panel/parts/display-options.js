import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { COMPLETED, ORDERINGS, icon, shipped } from "../config.js";
import { ask } from "../channel.js";
import { RequestKind } from "../enums.js";
import { takeKeyboard } from "../ui.js";
import { frame, item } from "./menu.js";

const DROPDOWN_WIDTH_PX = 124;

/** @type {{ by: NamedOption<Ordering>[], completed: NamedOption<Completed>[] }} */
const OPTIONS = { by: ORDERINGS, completed: COMPLETED };

export class DisplayOptions {
  /**
   * @param {Opened<DisplayProps>} props
   * @param {Context} cx
   */
  constructor({ display }, cx) {
    this.display = { ...display };
    // The dropdown that is open, by field, or null
    this.choosing = null;
    this.handle = cx.focus_handle();
    takeKeyboard(this.handle, cx);
  }

  /**
   * @param {Partial<Display>} change
   * @param {Context} cx
   */
  set(change, cx) {
    Object.assign(this.display, change);
    this.choosing = null;
    ask({ kind: RequestKind.DISPLAY, ids: [], change });
    cx.notify();
  }

  /** @param {Theme} t */
  render(t) {
    const display = this.display, field = this.choosing;
    /** @type {(change: Partial<Display>) => OnClick} */
    const set = (change) => (_e, cx) => this.set(change, cx);
    const root = frame(t, "display-options", this.handle);
    // The popup cannot grow, so an open dropdown's choices replace the popup's content until one is picked
    if (field) {
      /** @param {string} value */
      const pick = (value) => set(/** @type {Partial<Display>} */ ({ [field]: value }));
      return root.children(OPTIONS[field].map(({ id: value, label }) =>
        item(t, value, [div()
          .child(label)], pick(value), display[field] === value)
          .h(21)));
    }
    /**
     * @param {string} label
     * @param {NativeElement[]} controls
     */
    const line = (label, controls) => h_flex()
      .h(34)
      .flex_none()
      .px(9)
      .gap(8)
      .items_center()
      .child(div()
        .flex_1()
        .min_w(0)
        .truncate()
        .text_size(13)
        .text_color(t.muted)
        .child(label))
      .children(controls);
    /** @param {"by" | "completed"} name */
    const dropdown = (name) => h_flex()
      .id(`option-${name}`)
      .h(30)
      .w(DROPDOWN_WIDTH_PX)
      .flex_none()
      .px(10)
      .gap(6)
      .items_center()
      .rounded(8)
      .cursor_pointer()
      .border_1()
      .border_color(t.border)
      .bg(t.raised)
      .text_color(t.foreground)
      .hover((style) => style.bg(t.hover))
      .on_click((_e, cx) => { this.choosing = name; cx.notify(); })
      .child(div()
        .flex_1()
        .min_w(0)
        .truncate()
        .child(OPTIONS[name].find(({ id }) => id === display[name])?.label ?? display[name]))
      .child(svg(shipped("chevron-down"))
        .size(13)
        .flex_none()
        .text_color(t.muted));
    const direction = div()
      .id("direction")
      .size(28)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded(14)
      .cursor_pointer()
      .text_color(t.foreground)
      .hover((style) => style.bg(t.hover))
      .on_click(set({ reversed: !display.reversed }))
      .child(svg(icon(display.reversed ? "sort-up" : "sort-down"))
        .size(16));
    const knob = div()
      .size(14)
      .flex_none()
      .rounded(7)
      .bg(display.recency ? t.accent_foreground : t.muted);
    const recency = h_flex()
      .id("recency")
      .w(32)
      .h(18)
      .flex_none()
      .px(2)
      .items_center()
      .rounded(9)
      .cursor_pointer()
      .bg(display.recency ? t.accent : t.input)
      .on_click(set({ recency: !display.recency }))
      .children(display.recency ? [div()
        .flex_1(), knob] : [knob]);
    return root.py(8)
      .child(line("Ordering", [direction, dropdown("by")]))
      .child(line("Order completed by recency", [recency]))
      .child(div()
        .my(7)
        .h(1)
        .flex_none()
        .bg(t.border))
      .child(line("Completed issues", [dropdown("completed")]));
  }
}

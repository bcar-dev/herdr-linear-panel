import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { COMPLETED, ORDERINGS, icon, shipped } from "../config.js";
import { ask } from "../channel.js";
import { RequestKind } from "../enums.js";
import { takeKeyboard } from "../ui.js";
import { frame, item } from "./menu.js";
import { Radius, Space, Text } from "../style.js";

const DROPDOWN_WIDTH_PX = 124;

/** @type {{ by: NamedOption<Ordering>[], completed: NamedOption<Completed>[] }} */
const OPTIONS = { by: ORDERINGS, completed: COMPLETED };

export class DisplayOptions {
  /**
   * @param {Opened<DisplayProps>} props
   * @param {Context} context
   */
  constructor({ display }, context) {
    this.display = { ...display };
    /** @type {"by" | "completed" | null} */
    this.openDropdown = null;
    this.handle = context.focus_handle();
    takeKeyboard(this.handle, context);
  }

  /**
   * @param {Partial<Display>} change
   * @param {Context} context
   */
  set(change, context) {
    Object.assign(this.display, change);
    this.openDropdown = null;
    ask({ kind: RequestKind.DISPLAY, ids: [], change });
    context.notify();
  }

  /** @param {Theme} theme */
  render(theme) {
    const display = this.display, field = this.openDropdown;
    /** @type {(change: Partial<Display>) => OnClick} */
    const set = (change) => (_event, context) => this.set(change, context);
    const root = frame(theme, "display-options", this.handle);
    // The popup cannot grow, so an open dropdown's choices replace the popup's content until one is picked
    if (field) {
      /** @param {string} value */
      const pick = (value) => set(/** @type {Partial<Display>} */ ({ [field]: value }));
      return root.children(OPTIONS[field].map(({ id: value, label }) =>
        item(theme, value, [div()
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
      .gap(Space.M)
      .items_center()
      .child(div()
        .flex_1()
        .min_w(0)
        .truncate()
        .text_size(Text.BODY)
        .text_color(theme.muted)
        .child(label))
      .children(controls);
    /** @param {"by" | "completed"} name */
    const dropdown = (name) => h_flex()
      .id(`option-${name}`)
      .h(30)
      .w(DROPDOWN_WIDTH_PX)
      .flex_none()
      .px(10)
      .gap(Space.S)
      .items_center()
      .rounded(Radius.CARD)
      .cursor_pointer()
      .border_1()
      .border_color(theme.border)
      .bg(theme.raised)
      .text_color(theme.foreground)
      .hover((style) => style.bg(theme.hover))
      .on_click((_event, context) => { this.openDropdown = name; context.notify(); })
      .child(div()
        .flex_1()
        .min_w(0)
        .truncate()
        .child(OPTIONS[name].find(({ id }) => id === display[name])?.label ?? display[name]))
      .child(svg(shipped("chevron-down"))
        .size(13)
        .flex_none()
        .text_color(theme.muted));
    const direction = div()
      .id("direction")
      .size(28)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded_full()
      .cursor_pointer()
      .text_color(theme.foreground)
      .hover((style) => style.bg(theme.hover))
      .on_click(set({ reversed: !display.reversed }))
      .child(svg(icon(display.reversed ? "sort-up" : "sort-down"))
        .size(16));
    const knob = div()
      .size(14)
      .flex_none()
      .rounded(Radius.CONTROL)
      .bg(display.recency ? theme.accent_foreground : theme.muted);
    const recency = h_flex()
      .id("recency")
      .w(32)
      .h(18)
      .flex_none()
      .px(2)
      .items_center()
      .rounded_full()
      .cursor_pointer()
      .bg(display.recency ? theme.accent : theme.input)
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
        .bg(theme.border))
      .child(line("Completed issues", [dropdown("completed")]));
  }
}

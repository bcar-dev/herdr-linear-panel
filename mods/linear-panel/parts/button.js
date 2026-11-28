// The panel's button, for a block of the top bar: shows the panel, or hides the side panel when the panel is showing
import { image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { logo } from "../config.js";
import * as dock from "../dock.js";
import { isDark } from "../lib/color.js";
import { NAME, SLOT } from "../tracker.js";
import { Space, Text } from "../style.js";

export class PanelButton {
  constructor() {
    dock.register();
  }

  /** @param {Theme} theme */
  render(theme) {
    const on = dock.isShown();
    return h_flex()
      .size_full()
      .pr(10)
      .items_center()
      .bg(theme.chrome)
      .border_b(1)
      .border_color(theme.border)
      .child(h_flex()
        .id(`panel-${SLOT}`)
        .h(26)
        .px(8)
        .gap(Space.S)
        .flex_none()
        .items_center()
        .rounded_full()
        .text_size(Text.SMALL)
        .bg(on ? theme.selected : theme.chrome)
        .text_color(on ? theme.foreground : theme.muted)
        .hover((style) => style.bg(theme.hover))
        // The bar around the button drags the window: a press on the button must not
        .on_mouse_down("left", (_event, context) => context.stop_propagation())
        .on_click(() => (on ? dock.hide() : dock.show()))
        .child(image(logo(isDark(theme.chrome)))
          .size(14)
          .flex_none())
        .child(NAME));
  }
}

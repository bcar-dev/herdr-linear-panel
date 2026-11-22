// The panel's button, for a block of the top bar: shows the panel, or hides the side panel when the panel is showing.
import { image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { logo } from "../config.js";
import * as dock from "../dock.js";
import { isDark } from "../lib/color.js";
import { NAME, SLOT } from "../tracker.js";

export class PanelButton {
  constructor() {
    dock.register();
  }

  /** @param {Theme} t */
  render(t) {
    const on = dock.isShown();
    return h_flex().size_full().pr(10).items_center().bg(t.chrome).border_b(1).border_color(t.border)
      .child(h_flex().id(`panel-${SLOT}`).h(26).px(8).gap(5).flex_none().items_center().rounded(6).text_size(12)
        .bg(on ? t.selected : t.chrome).text_color(on ? t.foreground : t.muted)
        .hover((s) => s.bg(t.hover))
        // The bar around the button drags the window: a press on the button must not.
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click(() => (on ? dock.hide() : dock.show()))
        // The logo is drawn as a picture, in its own color: an icon would take the text's.
        .child(image(logo(isDark(t.chrome))).size(14).flex_none())
        .child(NAME));
  }
}

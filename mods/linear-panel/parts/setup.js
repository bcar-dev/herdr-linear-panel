// What the panel shows until an API key is set up: where to create one, and how to give it to the mod on this system.
import { div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { icon } from "../config.js";
import { KEY_PAGE, NAME, browse, keySetup } from "../tracker.js";

export class Setup {
  copied = false;

  /** @param {Theme} t */
  render(t) {
    const { how, command } = keySetup();
    /** @param {string} text */
    const line = (text) => div().text_color(t.muted).child(text);
    return v_flex().p(14).gap(8).text_size(12)
      .child(div().font_semibold().child(`Connect ${NAME}`))
      .child(line("1. Create a personal API key. Start and every change to an issue need write access:"))
      .child(div().id("key-page").cursor_pointer().text_color(t.accent)
        .on_click(() => { browse(KEY_PAGE); })
        .child(KEY_PAGE.replace("https://", "")))
      .child(line(`2. ${how}`))
      .child(h_flex().id("copy-command").p(8).gap(8).items_center().rounded(6).bg(t.raised).text_size(11)
        .cursor_pointer()
        .hover((s) => s.bg(t.hover))
        .on_click((_e, cx) => { cx.write_to_clipboard(command); this.copied = true; cx.notify(); })
        .child(div().flex_1().min_w(0).child(command))
        .child(div().flex_none().text_color(this.copied ? t.done : t.dim).child(this.copied ? "Copied" : "Copy")))
      .child(h_flex().gap(5).items_center().text_color(t.muted)
        .child("3. Press").child(svg(icon("refresh")).size(14)).child("above."));
  }
}

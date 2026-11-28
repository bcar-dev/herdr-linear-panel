// What the panel shows until an API key is set up: where to create one, and how to give it to the mod on this system
import { div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { icon } from "../config.js";
import { HOST, KEY_PAGE, KEY_PAGE_PATH, NAME, openLink, keySetup } from "../tracker.js";
import { Radius, Space, Text } from "../style.js";

export class Setup {
  copied = false;

  /** @param {Theme} theme */
  render(theme) {
    const { how, command } = keySetup();
    /** @param {string} text */
    const line = (text) => div()
      .text_color(theme.muted)
      .child(text);
    return v_flex()
      .p(14)
      .gap(Space.M)
      .text_size(Text.SMALL)
      .child(div()
        .font_semibold()
        .child(`Connect ${NAME}`))
      .child(line("1. Create a personal API key. Start and every change to an issue need write access:"))
      .child(div()
        .id("key-page")
        .cursor_pointer()
        .text_color(theme.accent)
        .on_click(() => { openLink(KEY_PAGE); })
        .child(`${HOST}/${KEY_PAGE_PATH}`))
      .child(line(`2. ${how}`))
      .child(h_flex()
        .id("copy-command")
        .p(8)
        .gap(Space.M)
        .items_center()
        .rounded(Radius.ROW)
        .bg(theme.raised)
        .text_size(Text.CAPTION)
        .cursor_pointer()
        .hover((style) => style.bg(theme.hover))
        .on_click((_event, context) => { context.write_to_clipboard(command); this.copied = true; context.notify(); })
        .child(div()
          .flex_1()
          .min_w(0)
          .child(command))
        .child(div()
          .flex_none()
          .text_color(this.copied ? theme.success : theme.dim)
          .child(this.copied ? "Copied" : "Copy")))
      .child(h_flex()
        .gap(Space.S)
        .items_center()
        .text_color(theme.muted)
        .child("3. Press")
        .child(svg(icon("refresh"))
          .size(14))
        .child("above."));
  }
}

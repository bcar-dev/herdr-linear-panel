import { div } from "gpui-kit";
import { h_flex, InputState } from "gpui-base";
import { submit } from "../channel.js";
import { RequestKind } from "../enums.js";
import { takeKeyboard } from "../ui.js";
import { caption, frame, searchField } from "./menu.js";

export class StartPrompt {
  /**
   * @param {Opened<StartProps>} props
   * @param {Context} context
   */
  constructor(props, context) {
    this.props = props;
    this.handle = context.focus_handle();
    this.input = InputState.new({ placeholder: "Add instructions (optional)…" });
    this.input.on("submit", () => this.start());
    takeKeyboard(this.input, context);
  }

  start() {
    submit(this.props, [this.props.issue], { kind: RequestKind.START, instructions: this.input.value() });
  }

  /** @param {Theme} theme */
  render(theme) {
    return frame(theme, "start-prompt", this.handle)
      .child(caption(theme, `Start ${this.props.issue.identifier} with ${this.props.agent}`))
      .child(h_flex()
        .h(32)
        .flex_none()
        .mx(3)
        .mb(5)
        .pl(8)
        .pr(4)
        .gap(6)
        .items_center()
        .rounded(7)
        .border_1()
        .border_color(theme.accent)
        .bg(theme.background)
        .child(searchField(theme, this.input))
        .child(div()
          .id("submit")
          .h(24)
          .px(24)
          .flex_none()
          .flex()
          .items_center()
          .justify_center()
          .rounded(5)
          .cursor_pointer()
          .bg(theme.solid)
          .text_color(theme.solid_foreground)
          .hover((style) => style.bg(theme.accent)
            .text_color(theme.accent_foreground))
          .text_size(12)
          .on_click(() => this.start())
          .child("Start")));
  }
}

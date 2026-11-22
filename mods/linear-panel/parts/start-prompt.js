import { div } from "gpui-kit";
import { h_flex, InputState, Input } from "gpui-base";
import { submit } from "../channel.js";
import { takeKeyboard } from "../ui.js";
import { caption, frame } from "./menu.js";

export class StartPrompt {
  /**
   * @param {Opened<StartProps>} props
   * @param {Context} cx
   */
  constructor(props, cx) {
    this.props = props;
    this.handle = cx.focus_handle();
    this.input = InputState.new({ placeholder: `Tell ${props.agent} what to do…` });
    this.input.on("submit", () => this.start());
    takeKeyboard(this.input, cx);
  }

  start() {
    submit(this.props, [this.props.issue], { kind: "start", text: this.input.value() });
  }

  /** @param {Theme} t */
  render(t) {
    return frame(t, "start-prompt", this.handle)
      .child(caption(t, `Start ${this.props.issue.identifier} with ${this.props.agent}`))
      .child(h_flex().h(32).flex_none().mx(3).mb(5).pl(8).pr(4).gap(6).items_center()
        .rounded(7).border_1().border_color(t.accent).bg(t.background)
        .child(Input.new(this.input).flex_1().h_full().text_size(12.8).text_color(t.foreground))
        .child(div().id("submit").h(24).px(9).flex_none().flex().items_center().rounded(5).cursor_pointer()
          .bg(t.solid).text_color(t.solid_foreground).text_size(12)
          .on_click(() => this.start())
          .child("Start")));
  }
}

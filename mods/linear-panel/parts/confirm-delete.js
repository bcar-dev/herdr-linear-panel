// The dialog that asks before a comment is deleted, which cannot be undone. No handler for Escape: Herdr closes the
// dialog on it before the mod sees the key
import { div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { ask, dismiss } from "../channel.js";
import { CommentChange, RequestKind } from "../enums.js";
import { takeKeyboard } from "../ui.js";
import { boxed } from "./menu.js";

const BUTTON_HEIGHT_PX = 36;
const HOVER_OPACITY = 0.88;
// The ring around Delete shows that Enter presses it
const RING_GAP_PX = 2;

export class ConfirmDelete {
  /**
   * @param {Opened<ConfirmDeleteProps>} props
   * @param {Context} context
   */
  constructor(props, context) {
    this.props = props;
    this.handle = context.focus_handle();
    takeKeyboard(this.handle, context);
  }

  confirm() {
    const { issue, comment, overlay } = this.props;
    ask({ ids: [issue.id], kind: RequestKind.COMMENT, change: CommentChange.DELETE, comment: comment.id });
    dismiss(overlay);
  }

  /** @param {Theme} theme */
  render(theme) {
    /**
     * @param {string} id
     * @param {string} label
     * @param {{ bg: Color, fg: Color, border: Color }} colors
     * @param {() => void} action
     */
    const button = (id, label, { bg, fg, border }, action) => h_flex()
      .id(id)
      .h(BUTTON_HEIGHT_PX)
      .px(16)
      .items_center()
      .rounded(BUTTON_HEIGHT_PX / 2)
      .cursor_pointer()
      .text_size(14)
      .bg(bg)
      .text_color(fg)
      .border_1()
      .border_color(border)
      .hover((style) => style.opacity(HOVER_OPACITY))
      .on_click(action)
      .child(label);
    const danger = { bg: theme.ansi1, fg: theme.background, border: theme.ansi1 };
    const remove = button("confirm-delete-yes", "Delete", danger, () => this.confirm());
    return boxed(theme, v_flex()
      .id("confirm-delete")
      .track_focus(this.handle)
      .on_key_down((event, context) => {
        if (event.key !== "enter") return;
        context.stop_propagation();
        this.confirm();
      })
      .size_full()
      .p(24)
      .gap(10))
      .child(div()
        .text_size(16)
        .font_semibold()
        .text_color(theme.foreground)
        .child("Delete this comment?"))
      .child(div()
        .text_size(14)
        .text_color(theme.muted)
        .child("You cannot undo this action."))
      .child(h_flex()
        .flex_1()
        .items_end()
        .justify_end()
        .gap(8)
        .child(button("confirm-delete-no", "Cancel", { bg: theme.raised, fg: theme.foreground, border: theme.border },
          () => dismiss(this.props.overlay)))
        .child(div()
          .p(RING_GAP_PX)
          .rounded(BUTTON_HEIGHT_PX / 2 + RING_GAP_PX)
          .border_1()
          .border_color(theme.ansi1)
          .child(remove)));
  }
}

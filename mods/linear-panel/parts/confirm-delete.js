// The dialog that asks before a comment is deleted, which cannot be undone. No handler for Escape: Herdr closes the
// dialog on it before the mod sees the key
import { div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { ask, dismiss } from "../channel.js";
import { CommentChange, RequestKind } from "../enums.js";
import { button, takeKeyboard } from "../ui.js";
import { boxed } from "./menu.js";
import { Space, Text } from "../style.js";

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
    const remove = button(theme, { id: "confirm-delete-yes", label: "Delete", tone: "danger",
      action: () => this.confirm() });
    return boxed(theme, v_flex()
      .id("confirm-delete")
      .track_focus(this.handle)
      .on_key_down((event, context) => {
        if (event.key !== "enter") return;
        context.stop_propagation();
        this.confirm();
      })
      .size_full()
      .p(Space.XXL)
      .gap(Space.L))
      .child(div()
        .text_size(Text.TITLE)
        .font_semibold()
        .text_color(theme.foreground)
        .child("Delete this comment?"))
      .child(div()
        .text_size(Text.LARGE)
        .text_color(theme.muted)
        .child("You cannot undo this action."))
      .child(h_flex()
        .flex_1()
        .items_end()
        .justify_end()
        .gap(Space.M)
        .child(button(theme, { id: "confirm-delete-no", label: "Cancel", action: () => dismiss(this.props.overlay) }))
        .child(div()
          .p(RING_GAP_PX)
          .rounded_full()
          .border_1()
          .border_color(theme.danger)
          .child(remove)));
  }
}

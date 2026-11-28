// The dialog that asks before a comment is deleted, which cannot be undone. Enter deletes. Cancel closes it, and so
// does Escape, which Herdr takes before the mod sees it
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
   * @param {Context} cx
   */
  constructor(props, cx) {
    this.props = props;
    this.handle = cx.focus_handle();
    takeKeyboard(this.handle, cx);
  }

  confirm() {
    const { issue, comment, overlay } = this.props;
    ask({ ids: [issue.id], kind: RequestKind.COMMENT, change: CommentChange.DELETE, comment: comment.id });
    dismiss(overlay);
  }

  /** @param {Theme} t */
  render(t) {
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
    const remove = button("confirm-delete-yes", "Delete", { bg: t.ansi1, fg: t.background, border: t.ansi1 },
      () => this.confirm());
    return boxed(t, v_flex()
      .id("confirm-delete")
      .track_focus(this.handle)
      .on_key_down((event, cx) => {
        if (event.key !== "enter") return;
        cx.stop_propagation();
        this.confirm();
      })
      .size_full()
      .p(24)
      .gap(10))
      .child(div()
        .text_size(16)
        .font_semibold()
        .text_color(t.foreground)
        .child("Delete this comment?"))
      .child(div()
        .text_size(14)
        .text_color(t.muted)
        .child("You cannot undo this action."))
      .child(h_flex()
        .flex_1()
        .items_end()
        .justify_end()
        .gap(8)
        .child(button("confirm-delete-no", "Cancel", { bg: t.raised, fg: t.foreground, border: t.border },
          () => dismiss(this.props.overlay)))
        .child(div()
          .p(RING_GAP_PX)
          .rounded(BUTTON_HEIGHT_PX / 2 + RING_GAP_PX)
          .border_1()
          .border_color(t.ansi1)
          .child(remove)));
  }
}

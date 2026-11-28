// The menu of a comment, a popup: edit it, resolve its thread, copy it, delete it. Edit and Delete are offered on my
// own comments only; a thread is resolved from its first comment. Delete asks the panel for the dialog that confirms it
import { MENU_ROW_HEIGHT_PX, MENU_RULE_HEIGHT_PX } from "../config.js";
import { ask, dismiss } from "../channel.js";
import { CommentChange, RequestKind } from "../enums.js";
import { glyph, takeKeyboard } from "../ui.js";
import { FRAME_PADDING_PX, entry, frame, rule } from "./menu.js";

/** @typedef {Extract<Work, { kind: "comment" | "clipboard" }>} Request */
/** @typedef {{ name: string, icon: string, label: string, request: Request }} Entry */

// The entries in blocks set apart by rules: Edit and Delete only on my own comments, Resolve only on a thread's first
/**
 * @param {PageComment} comment
 * @param {boolean} own
 * @returns {Entry[][]}
 */
function entriesOf(comment, own) {
  const resolved = Boolean(comment.resolvedAt), { id, url, body } = comment;
  /** @param {CommentChange | "start-edit" | "confirm-delete"} what */
  const change = (what) => /** @type {Request} */ ({ kind: RequestKind.COMMENT, change: what, comment: id });
  /**
   * @param {string} text
   * @param {string} label
   */
  const copy = (text, label) => /** @type {Request} */ ({ kind: RequestKind.CLIPBOARD, text, label });
  return [
    ...(own ? [[{ name: "edit", icon: "pencil", label: "Edit…", request: change("start-edit") }]] : []),
    ...(comment.parent ? [] : [[{ name: "resolve", icon: "resolve",
      label: resolved ? "Unresolve thread" : "Resolve thread",
      request: change(resolved ? CommentChange.UNRESOLVE : CommentChange.RESOLVE) }]]),
    [{ name: "link", icon: "copy-link", label: "Copy link to comment", request: copy(url, "Copied link to comment") },
      { name: "markdown", icon: "copy-markdown", label: "Copy content as Markdown",
        request: copy(body, "Copied comment as Markdown") }],
    ...(own ? [[{ name: "delete", icon: "trash", label: "Delete", request: change("confirm-delete") }]] : []),
  ];
}

/** @param {{ comment: PageComment, own: boolean }} props */
export function heightFor({ comment, own }) {
  const groups = entriesOf(comment, own);
  return groups.flat().length * MENU_ROW_HEIGHT_PX + (groups.length - 1) * MENU_RULE_HEIGHT_PX + FRAME_PADDING_PX;
}

export class CommentMenu {
  /**
   * @param {Opened<CommentMenuProps>} props
   * @param {Context} cx
   */
  constructor(props, cx) {
    this.props = props;
    this.handle = cx.focus_handle();
    takeKeyboard(this.handle, cx);
  }

  /** @param {Request} request */
  run(request) {
    const { issue, overlay } = this.props;
    ask({ ids: [issue.id], ...request });
    dismiss(overlay);
  }

  /** @param {Theme} t */
  render(t) {
    const { comment, own } = this.props;
    return frame(t, "comment-menu", this.handle)
      .children(entriesOf(comment, own)
        .flatMap((group, nth) => [...(nth ? [rule(t)] : []),
          ...group.map(({ name, icon, label, request }) =>
            entry(t, name, glyph(t, icon), label)
              .on_click(() => this.run(request)))]));
  }
}

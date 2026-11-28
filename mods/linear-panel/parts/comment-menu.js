// The menu of a comment, a popup: edit it, resolve its thread, copy it, delete it. Edit and Delete are offered on my
// own comments only; a thread is resolved from its first comment. Delete asks the panel for the dialog that confirms it
import { MENU_RULE_HEIGHT_PX } from "../config.js";
import { ask, dismiss } from "../channel.js";
import { CommentChange, RequestKind } from "../enums.js";
import { glyph, takeKeyboard } from "../ui.js";
import { FRAME_PADDING_PX, entry, frame, rule } from "./menu.js";
import { Height } from "../style.js";

/** @typedef {Extract<Work, { kind: "comment" | "clipboard" }>} Request */
/** @typedef {{ name: string, icon: string, label: string, request: Request }} Entry */

// The entries in blocks set apart by rules: Edit and Delete only on my own comments, Resolve only on a thread's first
/**
 * @param {PageComment} comment
 * @param {boolean} isMine
 * @returns {Entry[][]}
 */
function entriesOf(comment, isMine) {
  const resolved = Boolean(comment.resolvedAt), { id, url, body } = comment;
  /** @param {CommentChange | "start-edit" | "confirm-delete"} what */
  const change = (what) => /** @type {Request} */ ({ kind: RequestKind.COMMENT, change: what, comment: id });
  /**
   * @param {string} text
   * @param {string} label
   */
  const copy = (text, label) => /** @type {Request} */ ({ kind: RequestKind.CLIPBOARD, text, label });
  return [
    ...(isMine ? [[{ name: "edit", icon: "pencil", label: "Edit…", request: change("start-edit") }]] : []),
    ...(comment.parent ? [] : [[{ name: "resolve", icon: "resolve",
      label: resolved ? "Unresolve thread" : "Resolve thread",
      request: change(resolved ? CommentChange.UNRESOLVE : CommentChange.RESOLVE) }]]),
    [{ name: "link", icon: "copy-link", label: "Copy link to comment", request: copy(url, "Copied link to comment") },
      { name: "markdown", icon: "copy-markdown", label: "Copy content as Markdown",
        request: copy(body, "Copied comment as Markdown") }],
    ...(isMine ? [[{ name: "delete", icon: "trash", label: "Delete", request: change("confirm-delete") }]] : []),
  ];
}

/** @param {{ comment: PageComment, isMine: boolean }} props */
export function heightFor({ comment, isMine }) {
  const groups = entriesOf(comment, isMine);
  return groups.flat().length * Height.MENU_ROW + (groups.length - 1) * MENU_RULE_HEIGHT_PX + FRAME_PADDING_PX;
}

export class CommentMenu {
  /**
   * @param {Opened<CommentMenuProps>} props
   * @param {Context} context
   */
  constructor(props, context) {
    this.props = props;
    this.handle = context.focus_handle();
    takeKeyboard(this.handle, context);
  }

  /** @param {Request} request */
  run(request) {
    const { issue, overlay } = this.props;
    ask({ ids: [issue.id], ...request });
    dismiss(overlay);
  }

  /** @param {Theme} theme */
  render(theme) {
    const { comment, isMine } = this.props;
    return frame(theme, "comment-menu", this.handle)
      .children(entriesOf(comment, isMine)
        .flatMap((group, nth) => [...(nth ? [rule(theme)] : []),
          ...group.map(({ name, icon, label, request }) =>
            entry(theme, name, glyph(theme, icon), label)
              .on_click(() => this.run(request)))]));
  }
}

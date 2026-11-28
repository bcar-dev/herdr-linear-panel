// An issue page's comments: what the tracker says of them and of the description, and the fields that write, reply
// and edit. Text typed and not sent stays in the store as a draft, and a field is sent once, however often submitted.
// No drawing: the page draws from here
import { TextareaState } from "gpui-base";
import * as api from "../api.js";
import { CommentChange } from "../enums.js";
import { focusSoon } from "../ui.js";
import { message } from "../lib/text.js";

const FIELD_MAX_ROWS = 8;
const FIELD_MIN_ROWS = 1;

/** @typedef {import("gpui-base").TextareaState} Field */
/** @typedef {(field: Field, left?: (context: Context) => void) => void} Watch */

export class Comments {
  /** @type {string | null} */ description = null;
  /** @type {PageComment[]} */ posted = [];
  loaded = false;
  /** @type {Map<string, Field>} by the comment they reply to */ replies = new Map();
  /** @type {{ id: string, field: Field } | null} */ edited = null;
  /** @type {Set<string>} */ #sendingReplyTo = new Set();

  /**
   * @param {Panel} panel
   * @param {Issue} issue
   * @param {Watch} watch counts the fields that have the keyboard
   */
  constructor(panel, issue, watch) {
    this.panel = panel;
    this.issue = issue;
    this.watch = watch;
    this.composer = this.#field("Leave a comment…", (context) => this.send("", context), "");
    const known = panel.store.pages.get(issue.id);
    if (known) this.#take(known);
  }

  /** @param {Context} context */
  load(context) {
    context.spawn(async (context) => {
      try {
        const page = await api.page(this.issue.id);
        this.panel.store.pages.set(this.issue.id, page);
        this.#take(page);
      } catch (error) {
        this.panel.requests.failed = `${this.issue.identifier}: ${message(error)}`;
      }
      context.notify();
    });
  }

  // Sends what the field holds: the composer's for `replyTo` "", else the reply's to that comment
  /**
   * @param {string} replyTo
   * @param {Context} context
   */
  send(replyTo, context) {
    const field = replyTo ? this.replies.get(replyTo) : this.composer, body = field?.value()
      .trim();
    // A second press while the first is on its way would post the comment twice
    if (!field || !body || this.#sendingReplyTo.has(replyTo)) return;
    this.#sendingReplyTo.add(replyTo);
    const task = () => api.comment(this.issue.id, body, replyTo || undefined)
      .finally(() => this.#sendingReplyTo.delete(replyTo));
    this.panel.requests.track(task, this.issue, context, (context) => {
      field.set_value("");
      this.panel.store.drafts.delete(this.#draftKey(replyTo));
      this.load(context);
    });
  }

  /**
   * @param {string} id
   * @param {Context} context
   */
  startEdit(id, context) {
    const comment = this.posted.find((found) => found.id === id);
    if (!comment) return;
    if (this.edited) this.saveEdit(context);
    const field = this.#field("Edit comment…", (context) => this.saveEdit(context));
    field.set_value(comment.body);
    this.edited = { id, field };
    context.notify();
    const text = field.value();
    focusSoon(context, () => {
      if (this.edited?.field !== field || field.value() !== text) return;
      field.focus();
      field.set_selected_range({ start: text.length, end: text.length });
    });
  }

  // The field stays, with what was typed, until the tracker has taken it
  /** @param {Context} context */
  saveEdit(context) {
    if (!this.edited) return;
    const { id, field } = this.edited, body = field.value()
      .trim();
    if (!body || body === this.posted.find((comment) => comment.id === id)?.body) return this.stopEdit(context);
    this.panel.requests.track(() => api.changeComment(CommentChange.EDIT, id, body), this.issue, context,
      (context) => {
        if (this.edited?.field === field) this.edited = null;
        this.#finish(field);
        this.load(context);
      });
  }

  /** @param {Context} context */
  stopEdit(context) {
    if (this.edited) this.#finish(this.edited.field);
    this.edited = null;
    context.notify();
  }

  release() {
    const { drafts } = this.panel.store;
    /** @type {[string, Field][]} */
    const writing = [["", this.composer], ...this.replies];
    for (const [replyTo, field] of writing) {
      const text = field.value(), key = this.#draftKey(replyTo);
      if (text.trim()) drafts.set(key, text);
      else drafts.delete(key);
    }
    for (const [, field] of writing) field.release();
    this.edited?.field.release();
  }

  // A field that replies starts from its draft; an edit's field starts empty
  /**
   * @param {string} placeholder
   * @param {(context: Context) => void} submit
   * @param {string} [replyTo]
   */
  #field(placeholder, submit, replyTo) {
    const field = TextareaState.new({ placeholder });
    if (replyTo !== undefined) field.set_value(this.panel.store.drafts.get(this.#draftKey(replyTo)) ?? "");
    field.set_auto_grow(FIELD_MIN_ROWS, FIELD_MAX_ROWS);
    this.watch(field);
    field.on("submit", (_event, context) => submit(context));
    return field;
  }

  /** @param {{ description: string, comments: PageComment[] }} page */
  #take(page) {
    this.description = page.description;
    this.posted = page.comments;
    const present = new Set(page.comments.map(({ id }) => id));
    for (const [id, field] of this.replies) {
      if (!present.has(id)) { field.release(); this.replies.delete(id); }
    }
    for (const { id } of page.comments) {
      if (!this.replies.has(id)) this.replies.set(id, this.#field("Leave a reply…", (context) => this.send(id, context),
        id));
    }
    this.loaded = true;
  }

  /** @param {string} replyTo */
  #draftKey(replyTo) {
    return `${this.issue.id}:${replyTo}`;
  }

  // Freeing a field is not a blur, and the page counts the fields that have the keyboard: it is given back first
  /** @param {Field} field */
  #finish(field) {
    field.blur();
    field.release();
  }
}

// An issue's page, which slides in over the panel's list. The panel owns the page and does the work; the page holds the
// text being edited and what the tracker said of the issue's description and comments. Drawing and its own text fields
// only: a property's choices, the label picker and every change go through the panel
import { div, svg } from "gpui-kit";
import { v_flex, h_flex, Input, InputState, ScrollHandle, Textarea, TextareaState } from "gpui-base";
import * as api from "../api.js";
import { litAnchor } from "../channel.js";
import { ERROR_TEXT_PX, PROPERTY_COLUMNS, icon, pageCopies, priorityEntry } from "../config.js";
import { CommentChange, Property, RequestKind, Side } from "../enums.js";
import { NAME, openLink } from "../tracker.js";
import { chordCaps, cycleMark, face, focusSoon, lit, mergeMark, pillRow, priorityMark, statusMark,
  teamMark, zoom } from "../ui.js";
import { mix } from "../lib/color.js";
import { cycleName, tense } from "../lib/cycles.js";
import { timeLabel } from "../lib/history.js";
import { clipped, merges, standing } from "../lib/merges.js";
import { arrange } from "../lib/grid.js";
import { message } from "../lib/text.js";
import { estimateText, memberName } from "../lib/teams.js";
import { propertyKey } from "../lib/keys.js";
import { textWidth } from "../lib/placement.js";
import { cycleCard, timeInStatus } from "./issue-list.js";
import { markdownView } from "./markdown-view.js";
import { mergeCardOf } from "./merge-card.js";

/** @typedef {import("gpui-base").TextareaState} Field */

const AVATAR_PX = 18;
const COMMENT_AVATAR_PX = 22;
const COMMENT_MENU_BUTTON_PX = 26;
const COMMENT_MENU_GLYPH_PX = 15;
const COMPOSER_AVATAR_PX = 20;
const DIFF_TITLE_MAX_CHARS = 48;
const DIFFS_SHOWN = 3;
const EDGE_RAISED_MIX = 0.7;
const FIELD_MAX_ROWS = 8;
const FIELD_MIN_ROWS = 1;
const ICON_BUTTON_PX = 24;
const ICON_COLUMN_PX = 20;
const LABEL_CHIP_HEIGHT_PX = 24;
const NAME_CHARACTER_WIDTH_PX = 7.6;
const PAGE_BUTTON_GLYPH_PX = 13;
const PROPERTY_ICON_PX = 14;
const PROPERTY_PADDING_PX = 8;
const SCROLL_ID = "page-scroll";
const SURFACE_RAISED_MIX = 0.4;
const TEAM_MARK_PX = 18;
const UNKNOWN_USER_GREY = "#6b6f76";

export const SLIDE_MS = 220;

/** @param {Pick<Member, "initials" | "avatarBackgroundColor"> | null | undefined} user */
const faceOf = (user, size = AVATAR_PX) =>
  face(user?.initials ?? "?", user?.avatarBackgroundColor ?? UNKNOWN_USER_GREY, size);
/** @param {PageComment} comment */
const author = (comment) => (comment.user ? memberName(comment.user) : comment.botActor?.name || "Someone");
/** @param {{ focus(): void }} state */
const pressFocuses = (state) => (/** @type {MouseButtonEvent} */ _event, /** @type {Context} */ context) => {
  context.stop_propagation();
  state.focus();
};

/** @param {Issue} issue */
export const addLabelsId = (issue) => (issue.labels.nodes.length ? "page-add-label" : "page-add");

export class IssuePage {
  // False while the page waits at the panel's right edge, true once it slid in
  shown = false;
  // True once the slide in has ended: the list behind is then not drawn, so nothing of it answers the pointer
  settled = false;
  /** @type {string | null} */ description = null;
  /** @type {PageComment[]} */ comments = [];
  /** @type {boolean} */ loaded = false;
  // How many of the page's text fields have the keyboard: the panel leaves its own keys alone meanwhile
  focusedFieldCount = 0;
  commentHasKeyboard = false;
  // How wide the property lines reach, in pixels of a style (see `properties`)
  widestLinePx = 0;
  diffsOpen = false;
  columns = PROPERTY_COLUMNS;
  lastSavedTitle = "";
  /** @type {Field} */ composer;
  /** @type {Map<string, Field>} */ replies = new Map();
  // By the comment replied to, "" for a new comment
  /** @type {Set<string>} */ sendingReplyTo = new Set();
  /** @type {{ id: string, field: Field } | null} */ edited = null;
  /** @type {Map<string, { bounds: Bounds, scrolled: number }>} */ notedBounds = new Map();
  layoutKey = "";
  scroll = ScrollHandle.new();

  /**
   * @param {Panel} panel
   * @param {Issue} issue
   * @param {Context} context
   */
  constructor(panel, issue, context) {
    this.panel = panel;
    this.issue = issue;
    this.title = InputState.new({ value: issue.title, placeholder: "Title" });
    this.composer = this.field("Leave a comment…",
      (text, context) => this.send(text, undefined, this.composer, context), "");
    this.watch(this.title, (context) => this.saveTitle(context));
    this.title.on("submit", (_event, context) => { this.saveTitle(context); this.title.blur(); });
    const known = panel.store.pages.get(issue.id);
    if (known) this.take(known);
    this.load(context);
  }

  /**
   * @param {{ on: InputState["on"] }} field
   * @param {(context: Context) => void} left
   */
  watch(field, left) {
    let counted = false;
    field.on("focus", (_event, context) => {
      if (!counted) this.focusedFieldCount++;
      counted = true;
      this.commentHasKeyboard = false;
      context.notify();
    });
    field.on("blur", (_event, context) => {
      if (counted) this.focusedFieldCount = Math.max(0, this.focusedFieldCount - 1);
      counted = false;
      left(context);
      context.notify();
    });
  }

  // A field that replies (`replyTo` "" for a new comment) starts from its unsent draft; an edit's field starts empty
  /**
   * @param {string} placeholder
   * @param {(text: string, context: Context) => void} send
   * @param {string} [replyTo]
   */
  field(placeholder, send, replyTo) {
    const state = TextareaState.new({ placeholder });
    if (replyTo !== undefined) state.set_value(this.panel.store.drafts.get(this.draftKey(replyTo)) ?? "");
    state.set_auto_grow(FIELD_MIN_ROWS, FIELD_MAX_ROWS);
    this.watch(state, () => {});
    state.on("submit", (_event, context) => send(state.value(), context));
    return state;
  }

  /** @param {Context} context */
  load(context) {
    context.spawn(async (context) => {
      try {
        const page = await api.page(this.issue.id);
        this.panel.store.pages.set(this.issue.id, page);
        this.take(page);
      } catch (error) {
        this.panel.failed = `${this.issue.identifier}: ${message(error)}`;
      }
      context.notify();
    });
  }

  /** @param {{ description: string, comments: PageComment[] }} page */
  take(page) {
    this.description = page.description;
    this.comments = page.comments;
    const present = new Set(page.comments.map(({ id }) => id));
    for (const [id, field] of this.replies) {
      if (!present.has(id)) { field.release(); this.replies.delete(id); }
    }
    for (const { id } of page.comments) {
      if (!this.replies.has(id)) {
        this.replies.set(id,
          this.field("Leave a reply…", (text, context) => this.send(text, id, this.replies.get(id), context), id));
      }
    }
    this.loaded = true;
  }

  /**
   * @param {string} text
   * @param {string | undefined} parent
   * @param {Field | undefined} state
   * @param {Context} context
   */
  send(text, parent, state, context) {
    const body = text.trim(), key = parent ?? "";
    // A second press while the first is on its way would post the comment twice
    if (!body || this.sendingReplyTo.has(key)) return;
    this.sendingReplyTo.add(key);
    const task = () => api.comment(this.issue.id, body, parent)
      .finally(() => this.sendingReplyTo.delete(key));
    this.panel.trackedWork(task, this.issue, context, (context) => {
      state?.set_value("");
      this.panel.store.drafts.delete(this.draftKey(key));
      this.load(context);
    });
  }

  /** @param {string} replyTo */
  draftKey(replyTo) {
    return `${this.issue.id}:${replyTo}`;
  }

  /** @param {Context} context */
  saveTitle(context) {
    const title = this.title.value()
      .trim();
    if (!title) { this.title.set_value(this.issue.title); return; }
    if (title === this.issue.title || title === this.lastSavedTitle) return;
    this.lastSavedTitle = title;
    this.panel.perform({ kind: RequestKind.UPDATE, ids: [this.issue.id], input: { title } }, context,
      () => { this.lastSavedTitle = ""; });
  }

  /**
   * @param {Field} field
   * @param {number} [offset]
   */
  focusAt(field, offset = field.value().length) {
    field.focus();
    field.set_selected_range({ start: offset, end: offset });
  }

  release() {
    const { drafts } = this.panel.store;
    /** @type {[string, Field][]} */
    const comments = [["", this.composer], ...this.replies];
    for (const [parent, field] of comments) {
      const text = field.value(), key = this.draftKey(parent);
      if (text.trim()) drafts.set(key, text);
      else drafts.delete(key);
    }
    /** @type {{ release(): boolean }[]} */
    const fields = [this.title, this.composer, ...this.replies.values()];
    for (const state of this.edited ? [...fields, this.edited.field] : fields) state.release();
    this.scroll.release();
  }

  // Herdr tells where an element is only on a pointer event: noted at every move, for a key to open its control's
  // popup where a click would
  /** @param {string} id */
  noteBounds(id) {
    return (/** @type {{ bounds: Bounds }} */ event) => {
      if (this.settled) this.notedBounds.set(id, { bounds: event.bounds, scrolled: this.scroll.offset().y });
    };
  }

  /** @param {string} id */
  spot(id) {
    const noted = this.notedBounds.get(id), view = this.notedBounds.get(SCROLL_ID)?.bounds;
    if (!noted) return undefined;
    const bounds = { ...noted.bounds, y: noted.bounds.y - (this.scroll.offset().y - noted.scrolled) * zoom() };
    return view && (bounds.y + bounds.height <= view.y || bounds.y >= view.y + view.height) ? undefined : bounds;
  }

  /**
   * @param {Theme} theme
   * @param {string} text
   */
  heading(theme, text) {
    return div()
      .flex_none()
      .pt(14)
      .pb(5)
      .text_size(12)
      .text_color(theme.muted)
      .child(text);
  }

  /**
   * @param {Theme} theme
   * @param {string} id
   * @param {NativeElement} mark
   * @param {string} label
   * @param {(context: Context) => void} action
   * @param {{ label: string, caps: string[], body?: Tip["body"], entered?: (context: Context) => void }} [tip]
   */
  line(theme, id, mark, label, action, tip) {
    const base = this.pageLine(theme, `page-${id}`)
      .on_window_mouse_move(this.noteBounds(`page-${id}`))
      .text_color(theme.foreground);
    const row = tip ? this.panel.hints.on(base, tip.label, { caps: tip.caps, body: tip.body, side: this.side(),
      key: `page-${id}`,
      hover: (hovered, context) => { if (hovered) tip.entered?.(context); } }) : base;
    const column = div()
      .w(ICON_COLUMN_PX)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .child(mark);
    return this.panel.control(row, action)
      .child(column)
      .child(div()
        .min_w(0)
        .truncate()
        .child(label));
  }

  // As wide as its content (`self_start`), so a tooltip beside it sits at the content's end; the negative margin takes
  // back its padding
  /**
   * @param {Theme} theme
   * @param {string} id
   */
  pageLine(theme, id) {
    return pillRow(theme, id, 28, { px: 10, gap: 8 })
      .self_start()
      .max_w_full()
      .mx(-10)
      .text_size(14)
      .when(litAnchor() === id, (row) => row.bg(theme.hover));
  }

  /**
   * @param {Theme} theme
   * @param {Issue} issue
   */
  diffs(theme, issue) {
    const list = merges(issue);
    if (!list.length) return [];
    const shown = this.diffsOpen ? list : list.slice(0, DIFFS_SHOWN), hidden = list.length - DIFFS_SHOWN;
    const more = list.length > DIFFS_SHOWN ? [this.panel.control(this.pageLine(theme, "page-diffs-more")
      .text_color(theme.muted), (context) => { this.diffsOpen = !this.diffsOpen; context.notify(); })
      .child(div()
        .w(ICON_COLUMN_PX)
        .flex_none()
        .flex()
        .items_center()
        .justify_center()
        .child(svg(icon("unfold"))
          .size(14)))
      .child(this.diffsOpen ? "Show less" : `Show ${hidden} more`)] : [];
    return [this.heading(theme, "Diffs"), ...shown.map((merge) => {
      const key = `page-merge-${merge.url}`, underPointer = this.panel.hoveredControl === key;
      return this.panel.control(this.panel.hints.on(this.pageLine(theme, key), "", {
        key, side: Side.RIGHT, body: (theme) => mergeCardOf(this.panel, issue, merge, theme),
        hover: (hovered, context) => {
          this.panel.hoverControl(key, hovered, context);
          if (hovered) this.panel.loadMergeDetails(issue, context);
        },
      }), () => { openLink(merge.url); })
        .child(div()
          .w(ICON_COLUMN_PX)
          .flex_none()
          .flex()
          .items_center()
          .justify_center()
          .child(mergeMark(standing(merge), PROPERTY_ICON_PX)))
        .child(div()
          .flex_1()
          .min_w(0)
          .truncate()
          .child(underPointer ? merge.title : clipped(merge.title, DIFF_TITLE_MAX_CHARS)));
    }), ...more];
  }

  side() {
    return this.columns > 1 ? Side.BELOW : Side.RIGHT;
  }

  /**
   * @param {Theme} theme
   * @param {Issue} issue
   */
  properties(theme, issue) {
    const { panel } = this, team = panel.store.teams.get(issue.team.id), { cycle } = issue;
    const estimate = estimateText(team, issue.estimate);
    /** @param {Property} page */
    const choose = (page) => () => panel.openers.pickBeside(issue, page);
    const priority = priorityEntry(issue.priority).label;
    // How far the longest property line reaches
    const assignee = issue.assignee ? memberName(issue.assignee) : "Unassigned";
    const names = [issue.state.name, issue.team.name, priority, assignee, estimate,
      cycle ? cycleName(cycle) : "No cycle"];
    this.widestLinePx = PROPERTY_PADDING_PX + ICON_COLUMN_PX + PROPERTY_PADDING_PX
      + Math.max(...names.map((name) => textWidth(name, NAME_CHARACTER_WIDTH_PX)));
    const cycleLine = this.line(theme, "cycle", cycle
      ? cycleMark(tense(cycle, team?.cycles ?? [], Date.now()), PROPERTY_ICON_PX)
      : svg(icon("cycle-none"))
        .size(14)
        .flex_none()
        .text_color(theme.muted),
    cycle ? cycleName(cycle) : "No cycle", choose(Property.CYCLE));
    const lines = [
      this.line(theme, "status", statusMark(issue.state, team?.states), issue.state.name, choose(Property.STATUS), {
        label: "Change status", caps: propertyKey(Property.STATUS).caps,
        body: (theme) => timeInStatus(panel, issue, theme),
        entered: (context) => panel.loadStatusHistory(issue, context) }),
      this.line(theme, "team", teamMark(issue.team, TEAM_MARK_PX),
        issue.team.name, () => panel.openers.pickTeam(issue)),
      this.line(theme, "priority", priorityMark(theme, issue.priority, false), priority, choose(Property.PRIORITY),
        { label: "Change priority", caps: propertyKey(Property.PRIORITY).caps }),
      this.line(theme, "assign", issue.assignee ? faceOf(issue.assignee, AVATAR_PX)
      : svg(icon("no-assignee"))
        .size(AVATAR_PX)
        .flex_none()
        .text_color(theme.muted),
      assignee, choose(Property.ASSIGN)),
      this.line(theme, "estimate", svg(icon(issue.estimate === null ? "estimate-none" : "estimate"))
        .size(14)
        .flex_none()
        .text_color(theme.muted),
      estimate,
      choose(Property.ESTIMATE), { label: "Change estimate", caps: propertyKey(Property.ESTIMATE).caps }),
      cycle ? panel.hints.on(cycleLine, "", { key: "page-cycle", side: this.side(),
        body: (theme) => cycleCard(panel, issue, cycle, theme),
        hover: (hovered, context) => {
          if (hovered && Date.parse(cycle.startsAt) > Date.now()) panel.loadPlannedPoints(cycle, context);
        } })
      : cycleLine];
    // The lines fill the columns one after the other, each column down before the next
    return [this.heading(theme, "Properties"), h_flex()
      .w_full()
      .gap(8)
      .items_start()
      .children(arrange(lines, this.columns)
        .map((column) => v_flex()
          .flex_1()
          .min_w(0)
          .children(column)))];
  }

  /**
   * @param {Theme} theme
   * @param {Issue} issue
   */
  labels(theme, issue) {
    const { nodes } = issue.labels, adds = addLabelsId(issue);
    const open = (/** @type {Context} */ context) => this.panel.openers.chooseLabels(issue, context, adds);
    const tip = { caps: ["L"], key: "page-add-labels", side: Side.RIGHT };
    const plus = this.panel.iconButton(theme, { id: "page-add-label", name: "plus", label: "Add labels", caps: ["L"],
      glyph: PAGE_BUTTON_GLYPH_PX, size: ICON_BUTTON_PX, ring: false, side: Side.RIGHT, action: open })
      .on_window_mouse_move(this.noteBounds(adds))
      .hover((style) => style.bg(theme.hover))
      .when(litAnchor() === adds, (button) => button.bg(theme.hover));
    /** @param {IssueLabel} label */
    const chipId = (label) => `page-label-${label.id}`;
    const chips = nodes.map((label) => this.panel.control(h_flex()
      .id(chipId(label))
      .h(LABEL_CHIP_HEIGHT_PX)
      .flex_none()
      .px(9)
      .gap(6)
      .items_center()
      .rounded(12)
      .border_1()
      .border_color(theme.border)
      .text_size(12.5)
      .cursor_pointer()
      .hover((style) => style.bg(theme.hover))
      .when(litAnchor() === chipId(label), (chip) => chip.bg(theme.hover)),
    (context) => this.panel.openers.chooseLabel(issue, label, context, chipId(label)))
      .child(div()
        .size(9)
        .flex_none()
        .rounded(5)
        .bg(label.color))
      .child(label.name)
      .when(Boolean(label.parent), (element) => element.child(svg(icon("caret-down"))
        .size(10)
        .flex_none()
        .text_color(theme.muted))));
    return [this.heading(theme, "Labels"),
      nodes.length ? h_flex()
        .flex_wrap()
        .gap(6)
        .items_center()
        .children([...chips, plus])
      : this.panel.control(this.panel.hints.on(this.pageLine(theme, "page-add")
        .on_window_mouse_move(this.noteBounds("page-add"))
        .text_color(theme.muted), "Add labels", tip),
      open)
        .child(svg(icon("label"))
          .size(14)
          .flex_none())
        .child("Add label")];
  }

  /** @param {Theme} theme */
  surface(theme) {
    return mix(theme.background, theme.raised, SURFACE_RAISED_MIX);
  }

  /**
   * @param {Theme} theme
   * @param {NativeElement} element
   */
  box(theme, element) {
    return element.rounded(12)
      .border_1()
      .border_color(this.edge(theme))
      .bg(this.surface(theme))
      .shadow_sm();
  }

  /** @param {Theme} theme */
  edge(theme) {
    return mix(this.surface(theme), theme.raised, EDGE_RAISED_MIX);
  }

  /**
   * @param {Theme} theme
   * @param {string} id
   * @param {Field} state
   * @param {(text: string, context: Context) => void} send
   * @param {boolean} [mine]
   */
  composing(theme, id, state, send, mine = false) {
    return h_flex()
      .flex_none()
      .px(12)
      .py(6)
      .gap(8)
      .items_center()
      .on_mouse_down("left", pressFocuses(state))
      .children(mine ? [faceOf(this.panel.store.viewer, COMPOSER_AVATAR_PX)] : [])
      .child(Textarea.new(state)
        .flex_1()
        .min_w(0)
        .text_size(13)
        .text_color(theme.foreground))
      .child(this.panel.iconButton(theme, { id: `${id}-send`, name: "send", label: "Send",
        glyph: PAGE_BUTTON_GLYPH_PX, size: ICON_BUTTON_PX, ring: false,
        action: (context) => send(state.value(), context) }));
  }

  /**
   * @param {Theme} theme
   * @param {Issue} issue
   */
  identifier(theme, issue) {
    return div()
      .id("page-id")
      .flex_none()
      .px(4)
      .text_color(theme.muted)
      .text_size(18)
      .font_light()
      .child(issue.identifier);
  }

  /**
   * @param {Theme} theme
   * @param {Issue} issue
   */
  copies(theme, issue) {
    return h_flex()
      .flex_none()
      .gap(4)
      .items_center()
      .children([
        ...pageCopies()
          .map(({ what, icon: name, label, keys }) => {
            return this.panel.iconButton(theme, { id: `page-copy-${what}`, name, label,
              glyph: PAGE_BUTTON_GLYPH_PX, size: ICON_BUTTON_PX,
              caps: keys ? chordCaps(keys) : [],
              action: (context) => this.panel.perform({ kind: RequestKind.COPY, ids: [issue.id], what }, context) });
          }),
        this.panel.iconButton(theme, { id: "page-open", name: "external-link", label: `Open in ${NAME}`,
          glyph: PAGE_BUTTON_GLYPH_PX, size: ICON_BUTTON_PX,
          action: (context) => this.panel.perform({ kind: RequestKind.OPEN, ids: [issue.id] }, context) }),
      ]);
  }

  /**
   * @param {Theme} theme
   * @param {PageComment} comment
   */
  text(theme, comment) {
    if (this.edited?.id !== comment.id) {
      return markdownView(`body-${comment.id}`, comment.body, true)
        .on_mouse_down("left", (_event, context) => {
          context.stop_propagation();
          this.commentHasKeyboard = true;
          context.notify();
        });
    }
    const { field } = this.edited;
    /**
     * @param {string} id
     * @param {string} label
     * @param {OnClick} action
     */
    const plainButton = (id, label, action) => div()
      .id(id)
      .h(30)
      .px(12)
      .flex()
      .items_center()
      .rounded(18)
      .cursor_pointer()
      .text_size(14)
      .on_click(action)
      .text_color(theme.foreground)
      .hover((style) => style.bg(theme.hover))
      .child(label);
    /**
     * @param {string} id
     * @param {string} label
     * @param {OnClick} action
     */
    const primaryButton = (id, label, action) => div()
      .id(id)
      .h(36)
      .px(18)
      .flex()
      .items_center()
      .rounded(18)
      .cursor_pointer()
      .text_size(14)
      .on_click(action)
      .text_color(theme.foreground)
      .bg(this.surface(theme))
      .border_1()
      .border_color(theme.border)
      .hover((style) => style.bg(theme.hover))
      .child(label);
    return v_flex()
      .gap(14)
      .child(h_flex()
        .w_full()
        .on_mouse_down("left", pressFocuses(field))
        .child(Textarea.new(field)
          .flex_1()
          .min_w(0)
          .text_size(13)
          .text_color(theme.foreground)))
      .child(h_flex()
        .gap(8)
        .items_center()
        .justify_end()
        .child(plainButton("edit-cancel", "Cancel", (_event, context) => this.stopEdit(context)))
        .child(primaryButton("edit-save", "Save", (_event, context) => this.saveEdit(context))));
  }

  /**
   * @param {string} id
   * @param {Context} context
   */
  startEdit(id, context) {
    const comment = this.comments.find((found) => found.id === id);
    if (!comment) return;
    if (this.edited) this.saveEdit(context);
    const field = this.field("Edit comment…", (_text, context) => this.saveEdit(context));
    field.set_value(comment.body);
    this.edited = { id, field };
    context.notify();
    const text = field.value();
    focusSoon(context, () => {
      if (this.edited?.field === field && field.value() === text) this.focusAt(field);
    });
  }

  /** @param {Context} context */
  stopEdit(context) {
    if (this.edited) this.finish(this.edited.field);
    this.edited = null;
    context.notify();
  }

  // Freeing a field is not a blur, and the page counts the fields that have the keyboard: it is given back first
  /** @param {Field} field */
  finish(field) {
    field.blur();
    field.release();
  }

  // The field stays, with what was typed, until the tracker has taken it
  /** @param {Context} context */
  saveEdit(context) {
    if (!this.edited) return;
    const { id, field } = this.edited, body = field.value()
      .trim();
    if (!body || body === this.comments.find((comment) => comment.id === id)?.body) return this.stopEdit(context);
    this.panel.trackedWork(() => api.changeComment(CommentChange.EDIT, id, body), this.issue, context, (context) => {
      if (this.edited?.field === field) this.edited = null;
      this.finish(field);
      this.load(context);
    });
  }

  /**
   * @param {Theme} theme
   * @param {PageComment} comment
   * @param {boolean} first
   */
  comment(theme, comment, first) {
    const { user } = comment;
    return v_flex()
      .id(`comment-${comment.id}`)
      .flex_none()
      .px(12)
      .pt(first ? 8 : 10)
      .pb(10)
      .gap(8)
      .when(!first, (element) => element.border_t(1)
        .border_color(this.edge(theme)))
      .child(h_flex()
        .gap(8)
        .items_center()
        .child(faceOf(user, COMMENT_AVATAR_PX))
        .child(div()
          .font_medium()
          .text_size(13)
          .child(author(comment)))
        .child(div()
          .text_size(12)
          .text_color(theme.dim)
          .child(`${timeLabel(Date.now() - Date.parse(comment.createdAt))} ago`))
        .when(Boolean(comment.resolvedAt),
          (element) => element.child(div()
            .text_size(12)
            .text_color(theme.dim)
            .child("Resolved")))
        .child(div()
          .flex_1())
        .children(this.edited?.id === comment.id ? [] : [
          this.panel.iconButton(theme, { id: `more-${comment.id}`, name: "more", label: "Comment options",
            glyph: COMMENT_MENU_GLYPH_PX,
            size: COMMENT_MENU_BUTTON_PX, ring: false, action: () => this.panel.openers.commentMenu(comment) }),
        ]))
      .child(this.text(theme, comment));
  }

  /**
   * @param {Theme} theme
   * @param {string} id
   * @param {PageComment[]} thread
   */
  thread(theme, id, thread) {
    const reply = this.replies.get(id);
    return this.box(theme, v_flex()
      .flex_none()
      .mt(10))
      .children(thread.map((comment, nth) => this.comment(theme, comment, nth === 0)))
      .children(reply ? [div()
        .h(1)
        .flex_none()
        .bg(this.edge(theme)), this.composing(theme, `reply-${id}`, reply,
        (text, context) => this.send(text, id, reply, context), true)] : []);
  }

  // The page is as wide as the panel, which can be resized while the page shows; `width` only says how far right it
  // waits
  /**
   * @param {Theme} theme
   * @param {Issue} issue
   * @param {number} width
   * @param {(context: Context) => void} close
   */
  render(theme, issue, width, close) {
    this.issue = issue;
    const layoutKey = [Boolean(this.panel.failed), this.diffsOpen, merges(issue).length, zoom(),
      issue.labels.nodes.map((label) => label.id)
        .join()].join("|");
    if (layoutKey !== this.layoutKey) {
      this.layoutKey = layoutKey;
      this.notedBounds.clear();
    }
    const roots = this.comments.filter((comment) => !comment.parent);
    const body = v_flex()
      .id("page-body")
      .w_full()
      .text_size(13)
      .children(this.description ? [markdownView("description", this.description)] : []);
    const back = this.panel.control(pillRow(theme, "page-back", 32, { lit: false })
      .w(40)
      .justify_center()
      .border_1()
      .border_color(theme.muted)
      .bg(this.surface(theme)), close)
      .child(svg(icon("chevrons-right"))
        .size(16)
        .text_color(lit(theme, this.panel.hoveredControl === "page-back")));
    return v_flex()
      .id("issue-page")
      .absolute()
      .top(0)
      .bottom(0)
      .left(this.shown ? 0 : width)
      .w_full()
      .bg(theme.background)
      .transition("left", { duration: SLIDE_MS, easing: "ease-out" })
      // A press on a field stops before this one (`pressFocuses`), which gives the panel the keyboard
      .on_mouse_down("left", (_event, context) => {
        context.stop_propagation();
        this.commentHasKeyboard = false;
        this.panel.handle.focus();
      })
      .on_mouse_up("left", (_event, context) => context.stop_propagation())
      .child(v_flex()
        .flex_none()
        .border_b(1)
        .border_color(theme.border)
        .child(h_flex()
          .h(46)
          .flex_none()
          .px(8)
          .gap(10)
          .items_center()
          .child(this.panel.hints.on(back, "Back to the issues", { caps: ["Esc"], key: "page-back",
            hover: (on, context) => this.panel.hoverControl("page-back", on, context) }))
          .child(this.identifier(theme, issue))
          .child(div()
            .flex_1())
          .child(this.copies(theme, issue)))
        .child(div()
          .flex_none()
          .px(16)
          .pb(10)
          .on_mouse_down("left", pressFocuses(this.title))
          .child(Input.new(this.title)
            .w_full()
            .h(30)
            .text_size(16)
            .font_semibold()
            .text_color(theme.foreground))))
      .children(this.panel.failed ? [div()
        .id("page-failed")
        .flex_none()
        .px(16)
        .pt(6)
        .text_size(ERROR_TEXT_PX)
        .text_color(theme.ansi1)
        .cursor_pointer()
        .on_click((_event, context) => { this.panel.failed = null; context.notify(); })
        .child(this.panel.failed)] : [])
      .child(v_flex()
        .id(SCROLL_ID)
        .on_window_mouse_move(this.noteBounds(SCROLL_ID))
        .flex_1()
        .min_h(0)
        .overflow_y_scrollbar()
        .track_scroll(this.scroll)
        .px(16)
        .pb(12)
        .children(this.diffs(theme, issue))
        .children(this.properties(theme, issue))
        .children(this.labels(theme, issue))
        .child(div()
          .h(1)
          .mt(14)
          .flex_none()
          .bg(theme.border))
        .child(div()
          .flex_none()
          .mt(14)
          .child(body))
        .children(roots.map((root) => this.thread(theme, root.id,
          [root, ...this.comments.filter((comment) => comment.parent?.id === root.id)])))
        .when(!this.loaded, (element) => element.child(div()
          .pt(10)
          .text_size(12)
          .text_color(theme.dim)
          .child("Loading…")))
        .child(this.box(theme, v_flex()
          .flex_none()
          .mt(12))
          .child(this.composing(theme, "comment", this.composer,
            (text, context) => this.send(text, undefined, this.composer, context)))));
  }
}

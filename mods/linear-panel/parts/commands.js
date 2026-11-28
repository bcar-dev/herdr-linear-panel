// The command window on one or several issues: a list of actions, and a page of choices for each action that ends
// in "…". It shows as a dialog with every page, or as a popup opened straight at one page
import { div, svg } from "gpui-kit";
import { v_flex, h_flex, InputState, ScrollHandle } from "gpui-base";
import { MENU_ROW_HEIGHT_PX, MENU_RULE_HEIGHT_PX, MOD, PICK_HEAD_HEIGHT_PX, PICK_MAX_ROWS, icon,
  shipped } from "../config.js";
import { closeWithParent, dismiss, projectMembersOf, submit } from "../channel.js";
import { Mark, Page, Property, RequestKind } from "../enums.js";
import { FACE_SIZE_PX, cycleMark, face, glyph, keycaps, pillRow, priorityMark, statusMark,
  takeKeyboard } from "../ui.js";
import { choiceRows } from "../lib/choices.js";
import { propertyKey, spelled, unmodified } from "../lib/keys.js";
import { commonCycles, commonEstimates } from "../lib/teams.js";
import { issuesName } from "../lib/text.js";
import { MENU_ROW_RADIUS_PX, boxed, caption, rule, searchField } from "./menu.js";

// Herdr closes a popup or a dialog on Escape before the mod sees the key. A binding of the mod's own, in a context
// only this window declares, comes first: Escape can then go back one page instead of closing everything
const CONTEXT = "IssueCommands";
const ESCAPE = `${MOD.replace(/-/g, "_")}_escape`;

const BORDER_PX = 1;
const CAPTION_HEIGHT_PX = 28;
const CYCLE_MARK_SIZE_PX = 15;
const GROUP_TITLE_HEIGHT_PX = 26;
const ROOM_UNDER_RULE_PX = 6;
const HEAD_RULE_PX = 1 + ROOM_UNDER_RULE_PX;
const ICON_COLUMN_WIDTH_PX = 18;
const MONO = "Menlo";
/** @type {Partial<Record<Page, string>>} */
const NO_MATCH = {
  [Property.CYCLE]: "No cycle matches", [Property.ESTIMATE]: "No estimate matches",
  [Property.PRIORITY]: "No priority matches", [Property.STATUS]: "No status matches",
};
/** @type {Page[]} */
const NUMBERED = [Property.STATUS, Property.PRIORITY, Property.ASSIGN, Property.CYCLE];
const PADDING_PX = 10;
const ROW = MENU_ROW_HEIGHT_PX;

/**
 * @param {{ group?: number, title?: string }[]} rows
 * @param {number} nth
 */
const hasBreakBefore = (rows, nth) => (nth === 0 ? Boolean(rows[0]?.title) : rows[nth]?.group !== rows[nth - 1]?.group);

/** @param {{ group?: number, title?: string }[]} rows */
export const breaksHeight = (rows) => rows.reduce((sum, row, nth) =>
  sum + (!hasBreakBefore(rows, nth) ? 0 : row.title ? GROUP_TITLE_HEIGHT_PX : MENU_RULE_HEIGHT_PX), 0);

// With its border: shorter, the popup would squeeze its list
/** @param {{ breaksPx: number, bare: boolean, visible: number }} props */
export const heightFor = ({ breaksPx, bare, visible }) => 2 * BORDER_PX + PADDING_PX + PICK_HEAD_HEIGHT_PX
  + HEAD_RULE_PX + breaksPx + (bare ? 0 : CAPTION_HEIGHT_PX) + visible * MENU_ROW_HEIGHT_PX;

// How far down the popup the middle of its first choice is
/** @param {{ bare: boolean }} props */
export const leadFor = ({ bare }) => BORDER_PX + PADDING_PX / 2 + (bare ? 0 : CAPTION_HEIGHT_PX) + PICK_HEAD_HEIGHT_PX
  + HEAD_RULE_PX + MENU_ROW_HEIGHT_PX / 2;

/**
 * @param {Theme} t
 * @param {import("../lib/choices.js").ChoiceSource} source
 * @param {WorkflowState[]} [states]
 */
function rowIcon(t, source, states) {
  switch (source.property) {
    case Property.STATUS: return statusMark(source.state, states);
    case Property.PRIORITY: return priorityMark(t, source.value, true);
    case Property.ESTIMATE: return glyph(t, source.value === null ? "estimate-none" : "estimate");
    case Property.ASSIGN: return source.member
      ? face(source.member.initials ?? "", source.member.avatarBackgroundColor ?? t.raised)
      : svg(icon("no-assignee"))
        .size(FACE_SIZE_PX)
        .text_color(t.muted);
    default: return source.cycle ? cycleMark(source.tense, CYCLE_MARK_SIZE_PX, t.muted)
      : svg(icon("cycle-none"))
        .size(CYCLE_MARK_SIZE_PX)
        .text_color(t.muted);
  }
}

export class Commands {
  /** @type {Opened<CommandsProps>} */ props;
  /** @type {Issue[]} */ targets;
  /** @type {Team[]} */ teams;
  /** @type {string} */ me;
  /** @type {boolean | undefined} */ compact;
  /** @type {boolean | undefined} */ bare;
  /** @type {Page} */ page = Page.ACTIONS;
  /** @type {Choice[]} */ rows = [];
  // The row lit, -1 for none
  /** @type {number} */ at = -1;
  scroll = ScrollHandle.new();

  // `page` is "actions" or the page to open at. `compact` is the window as a popup on one property. `bare` leaves
  // out the chip naming the issues
  /**
   * @param {Opened<CommandsProps>} props
   * @param {Context} cx
   */
  constructor(props, cx) {
    const { targets, teams, page, me, compact, bare } = props;
    this.props = props;
    this.targets = targets;
    this.teams = teams;
    this.me = me;
    this.compact = compact;
    this.bare = bare;
    // Escape on a page goes back to the actions when the window opened at them, and closes a window opened at a page
    this.fromActions = page === Page.ACTIONS;
    this.handle = cx.focus_handle();
    // The pages filtered by typing, each with a field of its own: a field takes its placeholder only when it is made
    /** @type {Partial<Record<Page, ReturnType<typeof InputState.new>>>} */
    this.fields = { [Property.STATUS]: this.field("Change status…"),
      [Property.PRIORITY]: this.field(`${this.verb("priority")} priority to…`),
      [Property.ESTIMATE]: this.field(`${this.verb("estimate")} estimate to…`),
      [Property.ASSIGN]: this.field("Assign to…"), [Property.CYCLE]: this.field("Move to cycle…") };
    // The keymap is Herdr's: each window asks again for its binding
    try {
      cx.bind_keys([{ keystroke: "escape", action: ESCAPE, context: CONTEXT }]);
    } catch {
      // Without the binding, Escape closes the window, which is Herdr's own behaviour
    }
    this.open(page);
    takeKeyboard(this, cx);
  }

  release() {
    this.scroll.release();
    for (const field of Object.values(this.fields)) field?.release();
  }

  /** @param {string} placeholder */
  field(placeholder) {
    const input = InputState.new({ placeholder });
    input.on("change", (_e, cx) => { this.at = 0; this.scroll.scroll_to_item(0); cx.notify(); });
    input.on("submit", () => this.rows[this.at]?.run());
    return input;
  }

  // What is typed in the page's field, or null on a page without one
  typed() {
    return this.fields[this.page]?.value()
      .trim()
      .toLowerCase() ?? null;
  }

  focus() {
    const field = this.fields[this.page];
    if (field) field.focus();
    else this.handle.focus();
  }

  /** @param {Page} page */
  open(page) {
    this.page = page;
    const field = this.fields[page];
    if (field?.value()) field.set_value("");
    const rows = page === Page.ACTIONS ? [] : this.rowsOf(page), held = rows.findIndex((row) => row.mark === Mark.ALL);
    this.at = held >= 0 ? held : this.compact ? -1 : 0;
    this.reveal(rows);
    this.focus();
  }

  /** @param {Property} page */
  rowsOf(page) {
    const { targets, teams, me } = this;
    return choiceRows(page, { targets, teams, me, projectMembers: projectMembersOf(targets) });
  }

  // The list's children include the rules and titles between blocks of rows
  /** @param {{ group?: number, title?: string }[]} rows */
  reveal(rows) {
    if (this.at < 0) return;
    const between = rows.slice(0, this.at + 1)
      .filter((_row, nth) => hasBreakBefore(rows, nth)).length;
    this.scroll.scroll_to_item(this.at + between);
  }

  /** @param {Ask} request */
  send(request) {
    submit(this.props, this.targets, request);
  }

  /** @param {"priority" | "estimate"} field */
  verb(field) {
    return this.targets.every((issue) => !issue[field]) ? "Set" : "Change";
  }

  // The rows of the page showing: { label, icon, key, caps, mark, run }. `key` is the shortcut obeyed, as lib/keys.js
  // spells it, and `caps` how it shows when that is not the key in capitals. `mark` says whether all ("all") or part
  // ("some") of the issues already have that value
  /**
   * @param {Theme} t
   * @returns {Choice[]}
   */
  choices(t) {
    const { teams } = this;
    /** @param {IssueUpdate} input */
    const update = (input) => () => this.send({ kind: RequestKind.UPDATE, input });
    if (this.page !== Page.ACTIONS) {
      const query = this.typed() ?? "";
      return this.rowsOf(this.page)
        .filter((row) => row.words.toLowerCase()
          .includes(query))
        .map((row) => ({ label: row.label, note: row.note, key: row.key, mark: row.mark, group: row.group,
          title: row.title, icon: rowIcon(t, row.source, this.teams[0]?.states),
          run: () => (row.mark === Mark.ALL ? closeWithParent(this.props) : this.send(row.ask)) }));
    }
    return [
      { label: "Assign to…", icon: glyph(t, "assign"), ...propertyKey(Property.ASSIGN),
        run: () => this.open(Property.ASSIGN) },
      { label: "Un-assign from me", icon: glyph(t, "unassign"), key: "i", run: update({ assigneeId: null }) },
      { label: "Change status…", icon: glyph(t, "status"), ...propertyKey(Property.STATUS),
        run: () => this.open(Property.STATUS) },
      { label: `${this.verb("priority")} priority…`, icon: glyph(t, "priority-2"), ...propertyKey(Property.PRIORITY),
        run: () => this.open(Property.PRIORITY) },
      // An estimate scale belongs to a team: issues of several teams are offered the estimates all their scales have
      ...(commonEstimates(teams).length ? [{
        label: `${this.verb("estimate")} estimate…`, icon: glyph(t, "estimate"), ...propertyKey(Property.ESTIMATE),
        run: () => this.open(Property.ESTIMATE),
      }] : []),
      ...(commonCycles(teams).length ? [{
        label: "Move to cycle…", icon: glyph(t, "cycle"), ...propertyKey(Property.CYCLE),
        run: () => this.open(Property.CYCLE),
      }] : []),
    ];
  }

  /** @param {Context} cx */
  escape(cx) {
    if (!this.fromActions || this.page === Page.ACTIONS) return dismiss(this.props.overlay);
    this.open(Page.ACTIONS);
    cx.notify();
  }

  /**
   * @param {KeyEvent} event
   * @param {Context} cx
   */
  key(event, cx) {
    const rows = this.rows, modifiers = event.modifiers;
    const row = rows.find((candidate) => candidate.key === spelled(event));
    if (event.key === "down") { this.at = (this.at + 1) % Math.max(1, rows.length); this.reveal(rows); }
    else if (event.key === "up") {
      this.at = (Math.max(this.at, 0) + rows.length - 1) % Math.max(1, rows.length);
      this.reveal(rows);
    }
    else if (event.key === "enter") rows[this.at]?.run();
    // Typing in a page with a field filters it: its letters are not shortcuts. The digits of pages that number rows
    // still are
    else if ((this.typed() === null || (NUMBERED.includes(this.page) && /^\d$/.test(event.key)))
      && unmodified(modifiers) && row) row.run();
    else return;
    cx.stop_propagation();
    cx.notify();
  }

  /** @param {Theme} t */
  render(t) {
    const rows = this.rows = this.choices(t);
    if (this.at >= rows.length) this.at = 0;
    const [only] = this.targets;
    const chip = only && this.targets.length === 1 ? `${only.identifier} · ${only.title}` : issuesName(this.targets);
    const field = this.fields[this.page], besideMenu = Boolean(this.props.parent);
    const heading = field ? searchField(t, field, 13) : div()
      .child("Actions");
    // A dialog has a height to fill and its list takes what is left. A popup is as tall as its content, where a list
    // that only flexes collapses to nothing: there it gets its own height
    const list = v_flex()
      .id("commands-list")
      .overflow_y_scroll()
      .track_scroll(this.scroll);
    const sized = this.compact
      ? list.flex_none()
        .h(Math.min(rows.length, this.props.visible ?? PICK_MAX_ROWS) * ROW + breaksHeight(rows) || ROW)
      : list.flex_1()
        .min_h(0);
    /**
     * @param {Choice} row
     * @param {number} nth
     */
    const line = (row, nth) => pillRow(t, `command-${nth}`, ROW, { lit: false })
      .rounded(MENU_ROW_RADIUS_PX)
      .when(nth === this.at, (element) => element.bg(t.selected))
      .on_mouse_move((_e, cx) => { if (this.at !== nth) { this.at = nth; cx.notify(); } })
      .on_click((_e, cx) => { row.run(); cx.notify(); })
      .child(div()
        .w(ICON_COLUMN_WIDTH_PX)
        .flex_none()
        .flex()
        .items_center()
        .justify_center()
        .child(row.icon))
      .child(row.note ? h_flex()
        .flex_1()
        .min_w(0)
        .gap(8)
        .child(div()
          .flex_none()
          .child(row.label))
        .child(div()
          .min_w(0)
          .truncate()
          .text_color(t.dim)
          .child(row.note))
      : div()
        .flex_1()
        .min_w(0)
        .truncate()
        .child(row.label))
      .when(row.mark === Mark.ALL, (element) =>
        element.child(svg(shipped("check"))
          .size(13)
          .flex_none()
          .text_color(t.muted)))
      .when(row.mark === Mark.SOME, (element) => element.child(div()
        .flex_none()
        .text_color(t.muted)
        .child("–")))
      .children(!row.key ? [] : /^\d$/.test(row.key) && !row.caps
        ? [div()
          .flex_none()
          .text_size(12)
          .text_color(t.dim)
          .font_family(MONO)
          .child(row.key)]
        : [keycaps(t, row.caps ?? [row.key.toUpperCase()])]);
    return boxed(t, v_flex()
      .id("commands")
      .track_focus(this.handle)
      .w_full()
      .when(!this.compact, (element) => element.h_full())
      .min_h(0)
      .p(5))
      .text_size(12.8)
      .text_color(t.foreground)
      .key_context(CONTEXT)
      .on_action(ESCAPE, (_e, cx) => this.escape(cx))
      .on_key_down((event, cx) => this.key(event, cx))
      .when(!this.bare, (element) => element.child(h_flex()
        .flex_none()
        .min_w(0)
        .px(6)
        .pt(4)
        .child(div()
          .min_w(0)
          .truncate()
          .px(8)
          .py(2)
          .rounded(6)
          .bg(t.raised)
          .text_size(12)
          .text_color(t.muted)
          .child(chip))))
      .child(h_flex()
        .h(PICK_HEAD_HEIGHT_PX)
        .flex_none()
        .px(8)
        .gap(8)
        .items_center()
        .text_color(t.dim)
        .child(heading)
        .children(field && this.page !== Page.ACTIONS && !besideMenu
          ? [keycaps(t, propertyKey(/** @type {Property} */ (this.page)).caps)]
          : []))
      // Through the box's padding, edge to edge
      .child(div()
        .id("commands-rule")
        .h(1)
        .mx(-PADDING_PX / 2)
        .mb(ROOM_UNDER_RULE_PX)
        .flex_none()
        .bg(t.border))
      .child(sized
        .children(rows.flatMap((row, nth) => [
          ...(!hasBreakBefore(rows, nth) ? [] : [row.title ? caption(t, row.title)
            .h(GROUP_TITLE_HEIGHT_PX) : rule(t)]),
          line(row, nth),
        ]))
        .when(!rows.length, (element) => element.child(div()
          .p(8)
          .text_color(t.dim)
          .child(NO_MATCH[this.page] ?? "No one matches"))));
  }
}

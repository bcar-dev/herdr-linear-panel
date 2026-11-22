// The command window on one or several issues: a list of actions, and a page of choices for each action that ends
// in "…". It shows as a dialog with every page, or as a popup opened straight at one page.
import { div, svg } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { MOD, PRIORITIES, shipped } from "../config.js";
import { dismiss, submit } from "../channel.js";
import { glyph, keycaps, priorityMark, statusMark, takeKeyboard } from "../ui.js";
import { propertyKey, spelled } from "../lib/keys.js";
import { commonEstimates, commonMembers, commonStates, estimateLabel, share } from "../lib/teams.js";
import { boxed } from "./menu.js";

// Herdr closes a popup or a dialog on Escape before the mod sees the key. A binding of the mod's own, in a context
// only this window declares, comes first: Escape can then go back one page instead of closing everything.
const CONTEXT = "IssueCommands";
const ESCAPE = `${MOD.replace(/-/g, "_")}_escape`;

const ROW = 32;
// A popup's list scrolls past this many rows.
const MOST_ROWS = 16;

export class Commands {
  /** @type {Opened<CommandsProps>} */ props;
  /** @type {Issue[]} */ targets;
  /** @type {Team[]} */ teams;
  /** @type {string} */ me;
  /** @type {boolean | undefined} */ compact;
  /** @type {boolean | undefined} */ bare;
  /** @type {Page} */ page = "actions";
  /** @type {Choice[]} */ rows = [];

  // `targets` are the issues and `teams` the teams they belong to; `page` is "actions" or the page to open at.
  // `compact` is the window as a popup on one property. `bare` leaves out the chip naming the issues.
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
    // Escape on a page goes back to the actions when the window opened at them, and closes a window opened at a page.
    this.fromActions = page === "actions";
    this.handle = cx.focus_handle();
    this.input = InputState.new({ placeholder: "Assign to…" });
    this.input.on("change", (_e, cx) => { this.at = 0; cx.notify(); });
    this.input.on("submit", () => this.rows[this.at]?.run());
    // The keymap is Herdr's: each window asks again for its binding.
    try {
      cx.bind_keys([{ keystroke: "escape", action: ESCAPE, context: CONTEXT }]);
    } catch {
      // Without the binding, Escape closes the window, which is Herdr's own behaviour.
    }
    this.open(page);
    takeKeyboard(this, cx);
  }

  // The assign page is filtered by typing, so its field has the keyboard. The other pages take keys themselves.
  focus() {
    if (this.page === "assign") this.input.focus();
    else this.handle.focus();
  }

  /** @param {Page} page */
  open(page) {
    this.page = page;
    // The row the arrow keys are on. A popup on one property starts on none, so that nothing looks chosen before
    // the person moves; the window with every action starts on its first row.
    this.at = this.compact ? -1 : 0;
    this.focus();
  }

  /** @param {Ask} request */
  send(request) {
    submit(this.props, this.targets, request);
  }

  /** @param {"priority" | "estimate"} field */
  verb(field) {
    return this.targets.every((issue) => !issue[field]) ? "Set" : "Change";
  }

  title() {
    return /** @type {Record<string, string>} */ ({
      actions: "Actions",
      status: "Change status…",
      priority: `${this.verb("priority")} priority to…`,
      estimate: `${this.verb("estimate")} estimate to…`,
    })[this.page];
  }

  // The rows of the page showing: { label, icon, key, caps, mark, run }. `key` is the shortcut obeyed, as lib/keys.js
  // spells it, and `caps` how it shows when that is not the key in capitals. `mark` says whether all ("all") or part
  // ("some") of the issues already have that value.
  /**
   * @param {Theme} t
   * @returns {Choice[]}
   */
  choices(t) {
    const { targets, teams } = this;
    /** @param {IssueUpdate} input */
    const update = (input) => () => this.send({ kind: "update", input });
    /**
     * @param {unknown} value
     * @param {(issue: Issue) => unknown} read
     */
    const held = (value, read) => share(targets.map(read), value);
    if (this.page === "status") {
      return commonStates(teams).map((state, i) => ({
        label: state.name,
        icon: statusMark(state, teams[0].states),
        key: i < 9 ? String(i + 1) : null,
        mark: held(state.name, (issue) => issue.state.name),
        run: () => this.send({ kind: "status", name: state.name }),
      }));
    }
    if (this.page === "priority") {
      return PRIORITIES.map(([value, label]) => ({
        label,
        icon: priorityMark(t, value, true),
        key: String(value),
        mark: held(value, (issue) => issue.priority),
        run: update({ priority: value }),
      }));
    }
    if (this.page === "estimate") {
      return [null, ...commonEstimates(teams)].map((value) => ({
        label: estimateLabel(teams[0], value) ?? "No estimate",
        icon: glyph(t, value === null ? "estimate-none" : "estimate"),
        mark: held(value, (issue) => issue.estimate ?? null),
        run: update({ estimate: value }),
      }));
    }
    if (this.page === "assign") {
      // A member's mark is their initials on their own color. Pictures are left out: a mod can only show an image
      // stored in Herdr's folder, not one at an address.
      /** @param {Member} member */
      const face = (member) => div().size(18).flex().items_center().justify_center().rounded(9)
        .bg(member.avatarBackgroundColor ?? t.raised).text_size(8).text_color("#ffffff").child(member.initials ?? "");
      const query = this.input.value().trim().toLowerCase();
      return commonMembers(teams)
        .filter((member) => `${member.name} ${member.displayName}`.toLowerCase().includes(query))
        .map((member) => ({
          label: member.displayName || member.name,
          icon: face(member),
          mark: member.id === this.me ? "all" : null,
          run: update({ assigneeId: member.id }),
        }));
    }
    return [
      { label: "Assign to…", icon: glyph(t, "assign"), ...propertyKey("assign"), run: () => this.open("assign") },
      { label: "Un-assign from me", icon: glyph(t, "unassign"), key: "i", run: update({ assigneeId: null }) },
      { label: "Change status…", icon: glyph(t, "status"), ...propertyKey("status"), run: () => this.open("status") },
      { label: `${this.verb("priority")} priority…`, icon: glyph(t, "priority-2"), ...propertyKey("priority"),
        run: () => this.open("priority") },
      // An estimate scale belongs to a team: issues of several teams are offered the estimates all their scales have.
      ...(commonEstimates(teams).length ? [{
        label: `${this.verb("estimate")} estimate…`, icon: glyph(t, "estimate"), ...propertyKey("estimate"),
        run: () => this.open("estimate"),
      }] : []),
    ];
  }

  /** @param {Context} cx */
  escape(cx) {
    if (!this.fromActions || this.page === "actions") return dismiss(this.props.overlay);
    this.open("actions");
    cx.notify();
  }

  /**
   * @param {KeyEvent} e
   * @param {Context} cx
   */
  key(e, cx) {
    const rows = this.rows, m = e.modifiers, row = rows.find((candidate) => candidate.key === spelled(e));
    if (e.key === "down") this.at = (this.at + 1) % Math.max(1, rows.length);
    else if (e.key === "up") this.at = (Math.max(this.at, 0) + rows.length - 1) % Math.max(1, rows.length);
    else if (e.key === "enter") rows[this.at]?.run();
    // Typing in the assign page filters it: its letters are not shortcuts.
    else if (this.page !== "assign" && !m.control && !m.alt && !m.platform && row) row.run();
    else return;
    cx.stop_propagation();
    cx.notify();
  }

  /** @param {Theme} t */
  render(t) {
    const rows = this.rows = this.choices(t);
    if (this.at >= rows.length) this.at = 0;
    const chip = this.targets.length === 1 ? `${this.targets[0].identifier} · ${this.targets[0].title}`
      : `${this.targets.length} issues`;
    const heading = this.page === "assign"
      ? Input.new(this.input).flex_1().h_full().text_size(13).text_color(t.foreground)
      : div().child(this.title());
    // A dialog has a height to fill and its list takes what is left. A popup is as tall as its content, where a list
    // that only flexes collapses to nothing: there it gets its own height.
    const list = v_flex().id("commands-list").overflow_y_scrollbar();
    const sized = this.compact ? list.flex_none().h(Math.min(rows.length, MOST_ROWS) * ROW || ROW) : list.flex_1()
      .min_h(0);
    /**
     * @param {Choice} row
     * @param {number} i
     */
    const line = (row, i) => h_flex().id(`command-${i}`).h(ROW).flex_none().px(8).gap(9).items_center().rounded(7)
      .cursor_pointer()
      .when(i === this.at, (el) => el.bg(t.selected))
      .hover((s) => s.bg(t.hover))
      .on_click((_e, cx) => { row.run(); cx.notify(); })
      .child(div().w(18).flex_none().flex().items_center().justify_center().child(row.icon))
      .child(div().flex_1().min_w(0).truncate().child(row.label))
      .when(row.mark === "all", (el) => el.child(svg(shipped("check")).size(13).flex_none().text_color(t.muted)))
      .when(row.mark === "some", (el) => el.child(div().flex_none().text_color(t.muted).child("–")))
      .children(row.key ? [keycaps(t, row.caps ?? [row.key.toUpperCase()])] : []);
    return boxed(t, v_flex().id("commands").track_focus(this.handle).w_full().when(!this.compact, (el) => el.h_full())
      .min_h(0).p(5))
      .text_size(13).text_color(t.foreground)
      .key_context(CONTEXT)
      .on_action(ESCAPE, (_e, cx) => this.escape(cx))
      .on_key_down((e, cx) => this.key(e, cx))
      .when(!this.bare, (el) => el.child(h_flex().flex_none().min_w(0).px(6).pt(4)
        .child(div().min_w(0).truncate().px(8).py(2).rounded(6).bg(t.raised).text_size(12).text_color(t.muted)
          .child(chip))))
      .child(h_flex().h(36).flex_none().px(8).items_center().text_color(t.dim).child(heading))
      .child(sized
        .children(rows.map(line))
        .when(!rows.length, (el) => el.child(div().p(8).text_color(t.dim).child("No one matches"))));
  }
}

// The menu of one issue (a right-click on its row), or of the ticked issues together, and its Copy page.
import { svg } from "gpui-kit";
import { closeOverlay } from "herdr";
import { copiesFor, shipped } from "../config.js";
import { popups, submit } from "../channel.js";
import { openChoices, openCopyMenu, openStartPrompt } from "../popups.js";
import { NAME } from "../tracker.js";
import { isMac } from "../tracker.js";
import { chordCaps, glyph, takeKeyboard } from "../ui.js";
import { PROPERTIES, copyShortcut, spelled } from "../lib/keys.js";
import { changeable } from "../lib/teams.js";
import { caption, entry, frame, rule } from "./menu.js";

// How long the pointer rests on an entry before its page shows beside it, in ms.
const REST = 140;

export class IssueMenu {
  /** @type {Issue[]} */ issues;
  /** @type {Team[]} */ teams;
  /** @type {string} */ me;
  /** @type {string | null} */ agent;
  /** @type {Bounds | undefined} */ frame;
  /** @type {Point | undefined} */ origin;
  /** @type {string} */ overlay;

  // `issues` are the issues the menu is about and `teams` their teams, those that are loaded: without any, only the
  // priority can be changed. `frame` is the panel's bounds, which the pages opened from here stay inside, and
  // `origin` where the menu itself opened in it.
  /**
   * @param {Opened<IssueMenuProps>} props
   * @param {Context} cx
   */
  constructor({ issues, teams, me, agent, frame, origin, overlay }, cx) {
    this.issues = issues;
    this.teams = teams;
    this.me = me;
    this.agent = agent ?? null;
    this.frame = frame;
    this.origin = origin;
    this.overlay = overlay;
    this.handle = cx.focus_handle();
    // The page showing beside the menu: the entry it belongs to, and its overlay.
    /** @type {{ of: string, overlay: string } | { of: null, overlay: null }} */
    this.page = { of: null, overlay: null };
    takeKeyboard(this.handle, cx);
  }

  properties() {
    const offered = changeable(this.teams);
    return PROPERTIES.filter(([page]) => offered.includes(page));
  }

  // The pointer is on an entry: after a moment its page shows beside it, in place of the one that was showing.
  // An entry without a page only closes that one.
  /**
   * @param {string} id
   * @param {Bounds} bounds
   * @param {((bounds?: Bounds) => string) | null} opens
   * @param {Context} cx
   */
  rest(id, bounds, opens, cx) {
    this.bounds = bounds;
    if (this.rested === id) return;
    /** @type {string} */
    this.rested = id;
    cx.timer.after(REST, (cx) => { if (this.rested === id) this.turnTo(id, opens, cx); });
  }

  // `opens(bounds)` opens the page and answers its overlay.
  /**
   * @param {string} id
   * @param {((bounds?: Bounds) => string) | null} opens
   * @param {Context} cx
   */
  turnTo(id, opens, cx) {
    // Herdr may have closed the page by itself (Escape closes the popup on top): then it is opened again.
    if (this.page.of === id && popups().includes(this.page.overlay)) return;
    this.closePage();
    this.page = opens ? { of: id, overlay: opens(this.bounds) } : { of: null, overlay: null };
    cx.notify();
  }

  closePage() {
    if (this.page.overlay) closeOverlay(this.page.overlay);
  }

  // A page asked for by its key takes the menu's place, where the menu opened. The keyboard goes to that page, not
  // back to the panel.
  /** @param {(where: Where) => string} open */
  replaceWith(open) {
    this.replaced = true;
    this.closePage();
    closeOverlay(this.overlay);
    open({ point: this.origin, frame: this.frame });
  }

  /**
   * @param {KeyEvent} e
   * @param {Context} cx
   */
  key(e, cx) {
    const m = e.modifiers, property = this.properties().find(([, , key]) => key === spelled(e));
    if (property && !m.control && !m.alt && !m.platform) {
      cx.stop_propagation();
      this.replaceWith((where) => openChoices(this.issues, this.teams, property[0], this.me, where));
    }
  }

  /** @param {Theme} t */
  render(t) {
    const { issues, teams, me, agent, overlay } = this, [issue] = issues, single = issues.length === 1;
    /** @param {Bounds} [bounds] */
    const beside = (bounds) => ({ beside: bounds, frame: this.frame });
    /**
     * @param {string} id
     * @param {NativeElement} icon
     * @param {string} label
     * @param {string[] | null} caps
     * @param {(bounds?: Bounds) => string} opens
     */
    const paged = (id, icon, label, caps, opens) =>
      entry(t, id, icon, label, { caps, arrow: true, lit: this.page.of === id })
      .on_mouse_move((e, cx) => this.rest(id, e.bounds, opens, cx))
      .on_click((_e, cx) => this.turnTo(id, opens, cx));
    // Resting on it closes the page that was showing.
    /**
     * @param {string} id
     * @param {NativeElement} icon
     * @param {string} label
     * @param {OnClick} action
     */
    const plain = (id, icon, label, action) => entry(t, id, icon, label)
      .on_mouse_move((e, cx) => this.rest(id, e.bounds, null, cx))
      .on_click(action);
    return frame(t, "issue-menu", this.handle)
      .on_key_down((e, cx) => this.key(e, cx))
      .child(caption(t, single ? `${issue.identifier} · ${issue.title}` : `${issues.length} issues`))
      .children(this.properties().map(([page, label, , caps]) =>
        paged(page, glyph(t, page === "priority" ? "priority-2" : page), label, caps,
          (bounds) => openChoices(issues, teams, page, me, beside(bounds), { parent: overlay }))))
      .child(rule(t))
      .child(paged("copy", glyph(t, "clipboard"), "Copy", null,
        (bounds) => openCopyMenu(issues, beside(bounds), overlay)))
      .when(single, (el) => el
        .child(plain("open", glyph(t, "external-link"), `Open in ${NAME}`,
          () => { this.closePage(); submit({ overlay }, issues, { kind: "open" }); })))
      // Starting needs an agent to start: `agent` is its name.
      .children(single && agent !== null ? [
        rule(t),
        plain("start", svg(shipped("terminal")).size(15).text_color(t.muted), `Start with ${agent}…`,
          () => this.replaceWith((where) => openStartPrompt(issue, where, agent))),
      ] : []);
  }
}

export class CopyMenu {
  /**
   * @param {Opened<CopyMenuProps>} props
   * @param {Context} cx
   */
  constructor(props, cx) {
    this.props = props;
    this.entries = copiesFor(props.issues.length);
    this.handle = cx.focus_handle();
    takeKeyboard(this.handle, cx);
  }

  /** @param {CopyWhat} what */
  copy(what) {
    submit(this.props, this.props.issues, { kind: "copy", what });
  }

  /**
   * @param {KeyEvent} e
   * @param {Context} cx
   */
  key(e, cx) {
    const what = copyShortcut(e, isMac());
    if (what && this.entries.some((offered) => offered.what === what)) { cx.stop_propagation(); this.copy(what); }
  }

  /** @param {Theme} t */
  render(t) {
    return frame(t, "copy-menu", this.handle)
      .on_key_down((e, cx) => this.key(e, cx))
      .children(this.entries.map(({ what, label, keys }) =>
        entry(t, what, glyph(t, `copy-${what}`), label, { caps: keys && chordCaps(keys) })
          .on_click(() => this.copy(what))));
  }
}

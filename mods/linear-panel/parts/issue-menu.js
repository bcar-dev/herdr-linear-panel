// The menu of one issue (a right-click on its row), or of the ticked issues together, and its Copy page
import { svg } from "gpui-kit";
import { closeOverlay } from "herdr";
import { MENU_ROW_HEIGHT_PX, copiesFor, shipped } from "../config.js";
import { submit } from "../channel.js";
import { RequestKind } from "../enums.js";
import { openChoices, openCopyMenu, openStartPrompt } from "../popups.js";
import { NAME, isMac } from "../tracker.js";
import { GLYPH_SIZE_PX, chordCaps, glyph, takeKeyboard } from "../ui.js";
import { PROPERTIES, copyShortcut, spelled, unmodified } from "../lib/keys.js";
import { changeable } from "../lib/teams.js";
import { FRAME_PADDING_PX, caption, entry, frame, rule } from "./menu.js";
import { SubmenuHost } from "./submenu-host.js";

const CHROME_PX = 47, START_CHROME_PX = 56;

// Its rows are the properties and Copy, then for one issue Open, and Start under a rule of its own when there is an
// agent to start (`agent` is its name), all under a caption and a first rule
/** @param {{ issues: Issue[], teams: Team[], agent: string | null }} props */
export function menuHeightFor({ issues, teams, agent }) {
  const single = issues.length === 1, starts = single && agent !== null;
  const rows = changeable(teams).length + 1 + (single ? 1 : 0) + (starts ? 1 : 0);
  return rows * MENU_ROW_HEIGHT_PX + (starts ? START_CHROME_PX : CHROME_PX);
}

/** @param {{ issues: Issue[] }} props */
export const copyHeightFor = ({ issues }) =>
  copiesFor(issues.length).length * MENU_ROW_HEIGHT_PX + FRAME_PADDING_PX;

export class IssueMenu {
  /** @type {Issue[]} */ issues;
  /** @type {Team[]} */ teams;
  /** @type {string} */ me;
  /** @type {string | null} */ agent;
  /** @type {Bounds | undefined} */ frame;
  /** @type {Point | undefined} */ origin;
  /** @type {string} */ overlay;
  // Set when the menu only made way for another page: the keyboard does not go back to the panel
  replaced = false;

  // `teams` are those loaded: without any, only the priority can be changed. `frame` is the panel's bounds, which the
  // pages opened from here stay inside, and `origin` where the menu itself opened in it
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
    this.pages = new SubmenuHost();
    takeKeyboard(this.handle, cx);
  }

  properties() {
    const offered = changeable(this.teams);
    return PROPERTIES.filter(({ page }) => offered.includes(page));
  }

  // The keyboard goes to the new page, not back to the panel
  /** @param {(where: Where) => string} open */
  replaceWith(open) {
    this.replaced = true;
    this.pages.close();
    closeOverlay(this.overlay);
    open({ point: this.origin, frame: this.frame });
  }

  /**
   * @param {KeyEvent} event
   * @param {Context} cx
   */
  key(event, cx) {
    const modifiers = event.modifiers, property = this.properties()
      .find(({ key }) => key === spelled(event));
    if (property && unmodified(modifiers)) {
      cx.stop_propagation();
      this.replaceWith((where) => openChoices(this.issues, this.teams, property.page, this.me, where));
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
      entry(t, id, icon, label, { caps, arrow: true, lit: this.pages.page?.of === id })
        .on_mouse_move((event, cx) => this.pages.rest(id, event.bounds, opens, cx))
        .on_click((_e, cx) => this.pages.turnTo(id, opens, cx));
    /**
     * @param {string} id
     * @param {NativeElement} icon
     * @param {string} label
     * @param {OnClick} action
     * @param {string[]} [caps]
     */
    const plain = (id, icon, label, action, caps) => entry(t, id, icon, label, { caps })
      .on_mouse_move((event, cx) => this.pages.rest(id, event.bounds, null, cx))
      .on_click(action);
    return frame(t, "issue-menu", this.handle)
      .on_key_down((event, cx) => this.key(event, cx))
      .child(caption(t, single ? `${issue.identifier} · ${issue.title}` : `${issues.length} issues`))
      .children(this.properties()
        .map(({ page, icon: name, label, caps }) =>
          paged(page, glyph(t, name), label, caps,
            (bounds) => openChoices(issues, teams, page, me, beside(bounds), { parent: overlay }))))
      .child(rule(t))
      .child(paged("copy", glyph(t, "clipboard"), "Copy", null,
        (bounds) => openCopyMenu(issues, beside(bounds), overlay)))
      .when(single, (element) => element
        .child(plain("open", glyph(t, "external-link"), `Open in ${NAME}`,
          () => { this.pages.close(); submit({ overlay }, issues, { kind: RequestKind.OPEN }); },
          chordCaps(["Click"]))))
      .children(single && agent !== null ? [
        rule(t),
        plain("start", svg(shipped("terminal"))
          .size(GLYPH_SIZE_PX)
          .text_color(t.muted), `Start with ${agent}…`,
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
    submit(this.props, this.props.issues, { kind: RequestKind.COPY, what });
  }

  /**
   * @param {KeyEvent} event
   * @param {Context} cx
   */
  key(event, cx) {
    const what = copyShortcut(event, isMac());
    if (what && this.entries.some((offered) => offered.what === what)) { cx.stop_propagation(); this.copy(what); }
  }

  /** @param {Theme} t */
  render(t) {
    return frame(t, "copy-menu", this.handle)
      .on_key_down((event, cx) => this.key(event, cx))
      .children(this.entries.map(({ what, icon: name, label, keys }) =>
        entry(t, what, glyph(t, name), label, { caps: keys && chordCaps(keys) })
          .on_click(() => this.copy(what))));
  }
}

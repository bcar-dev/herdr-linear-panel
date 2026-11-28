// The panel: my issues by view, grouped by status, and everything that can be done to them from here. It holds what
// is shown and answers the clicks and keys; panel-view.js draws it, and requests.js does the work. The popups (see
// popups.js) only ask for it, through channel.js
import { svg } from "gpui-kit";
import { ScrollHandle } from "gpui-base";
import * as api from "../api.js";
import * as channel from "../channel.js";
import * as dock from "../dock.js";
import { knownAgents } from "herdr";
import { COMPLETED, ORDERINGS, RELOAD_EVERY_MS, VIEWS, icon } from "../config.js";
import { Completed, Ordering, RequestKind, ViewKey } from "../enums.js";
import { isMac, openPage } from "../tracker.js";
import { lit, roundButton } from "../ui.js";
import { keepSetting, readSetting } from "../lib/cache.js";
import { Drag } from "../lib/drag.js";
import { filters, groups } from "../lib/listing.js";
import { commandDown } from "../lib/keys.js";
import { Selection } from "../lib/selection.js";
import { pickAgent } from "../lib/start.js";
import { message } from "../lib/text.js";
import { Hints } from "./hints.js";
import { Loader } from "./loader.js";
import { IssuePage, SLIDE_MS } from "./issue-page.js";
import { Openers } from "./openers.js";
import { drawPanel } from "./panel-view.js";
import { detailKey, listKey } from "./panel-keys.js";
import { Requests } from "./requests.js";
import { Setup } from "./setup.js";
import { Store } from "./store.js";
import { Height } from "../style.js";

const DETAIL_APPEAR_DELAY_MS = 30;
const DETAIL_RELEASE_DELAY_MS = SLIDE_MS + 60;
const DETAIL_SETTLE_DELAY_MS = SLIDE_MS + 40;
const ICON_BUTTON_GLYPH_PX = 14;
const KEYBOARD_RETAKE_DELAYS_MS = [1, 8, 30];
const KEYBOARD_RETAKE_FINAL_DELAY_MS = 150;

// The stored value when it is the id of one of the options
/**
 * @template {string} T
 * @param {string} name
 * @param {NamedOption<T>[]} options
 */
const stored = (name, options) => options.find(({ id }) => id === readSetting(name))?.id;

// The stored list of names, or none when nothing readable is stored
/** @param {string} name */
function storedNames(name) {
  try {
    const names = JSON.parse(readSetting(name) ?? "[]");
    return Array.isArray(names) ? /** @type {string[]} */ (names) : [];
  } catch {
    return [];
  }
}

export class Panel {
  /** @type {Agent[]} the programs people can start, as Herdr knows them. Asked once: Herdr asks a shell for them */
  agents = [];
  /** @type {Bounds | undefined} the panel's bounds in the window, as the pointer last told */
  frame;
  /** @type {IssuePage | null} */
  detail = null;
  /** @type {string | null} */
  hoveredControl = null;
  /** @type {string | null} */
  litId = null;
  /** @type {Point | undefined} */
  pointer;
  /** @type {Point | undefined} where the last control was pressed */
  pressedAt;
  /** @type {Bounds | undefined} */
  pressedBounds;
  // The panel keeps its focused look while it takes the keyboard back from a popup
  retaking = false;
  /** @type {string[]} the issues in the order drawn, for a Shift+click to span: not those of a folded group */
  visibleIds = [];
  scroll = ScrollHandle.new();
  loader = new Loader((context) => this.load(context));

  /**
   * @param {PanelProps} settings
   * @param {Context} context
   */
  constructor(settings, context) {
    this.settings = settings;
    this.requests = new Requests(this);
    api.use(settings.api, (ms) => new Promise((resolve) => context.timer.after(ms, () => resolve())));
    context.spawn(async (context) => {
      try {
        this.agents = await knownAgents();
      } catch (error) {
        this.requests.failed = `Could not list the agents: ${message(error)}`;
      }
      context.notify();
    });
    this.view = stored("view", VIEWS) ?? ViewKey.CYCLE;
    this.display = {
      by: stored("order", ORDERINGS) ?? Ordering.PRIORITY,
      reversed: readSetting("reversed") === "1",
      recency: readSetting("recency") !== "0",
      completed: stored("completed", COMPLETED) ?? Completed.WEEK,
    };
    this.totals = readSetting("totals") === "count" ? "count" : "points";
    this.folded = new Set(storedNames("folded"));
    this.store = new Store();
    this.openers = new Openers(this);
    this.selection = new Selection();
    this.drag = new Drag();
    this.hints = new Hints(() => channel.popups().length > 0);
    this.setup = new Setup();
    this.handle = context.focus_handle();
    channel.reset();
    this.keyboardAt = channel.givenBack();
    this.poll(context);
    context.timer.every(RELOAD_EVERY_MS, (context) => this.poll(context));
  }

  // The first load shows a spinner, a catch-up does not
  /** @param {Context} context */
  poll(context) {
    if (!dock.isShown()) return;
    if (this.loader.loadedAt === 0) this.loader.reload(context);
    else this.loader.reloadQuietly(context);
  }

  ticked() {
    const loaded = this.store.index();
    return this.selection.list()
      .flatMap((id) => loaded.get(id) ?? []);
  }

  sections() {
    return groups(this.store.issues[this.view], this.display);
  }

  /** @param {Issue[]} issues */
  inListOrder(issues) {
    const order = this.sections()
      .flatMap((group) => group.issues.map((issue) => issue.id));
    return [...issues].sort((first, second) => order.indexOf(first.id) - order.indexOf(second.id));
  }

  // A reload the person asked for (R, the reload button) also asks again for what is otherwise asked once a run: the
  // teams, projects and labels
  /** @param {Context} context */
  refresh(context) {
    this.store.askAgainWhenNeeded();
    this.loader.reload(context);
  }

  /** @param {Context} context */
  async load(context) {
    const { store } = this;
    const viewer = await api.issues(filters(this.display.completed, Date.now()));
    store.apply(viewer);
    this.selection.keep(new Set(store.issues[this.view].map((issue) => issue.id)));
    this.requests.settle(store.loadProjects(), "the projects", context);
    // The issues wait for the teams never seen; the others show with what was kept, and are updated when the answer
    // comes
    const unseen = store.unseenTeams(), teams = store.loadTeams();
    if (!teams) return;
    if (unseen) return teams;
    this.requests.settle(teams, "the teams", context);
  }

  // Takes the keyboard back once a popup opened from the panel has gone (channel.js), unless another popup is still
  // open. Herdr hands the keyboard to the terminal a few milliseconds after a popup closes, whoever had it before:
  // the panel takes it again right after, several times because the moment is not known. It cannot take it here,
  // while drawing. Meanwhile it keeps its focused look (`retaking`), so its outline does not blink. The first tries
  // come sooner than `focusSoon` goes, and the last one ends the look
  /** @param {Context} context */
  retake(context) {
    const at = channel.givenBack();
    if (!at || at === this.keyboardAt) return;
    this.keyboardAt = at;
    this.retaking = true;
    const take = () => { if (!channel.popups().length && !this.detail?.comments.edited) this.handle.focus(); };
    for (const wait of KEYBOARD_RETAKE_DELAYS_MS) context.timer.after(wait, take);
    context.timer.after(KEYBOARD_RETAKE_FINAL_DELAY_MS, (context) => {
      take();
      this.retaking = false;
      context.notify();
    });
  }

  /**
   * @param {Partial<Display>} change
   * @param {Context} context
   */
  redisplay(change, context) {
    Object.assign(this.display, change);
    keepSetting("order", this.display.by);
    keepSetting("reversed", this.display.reversed ? "1" : "0");
    keepSetting("recency", this.display.recency ? "1" : "0");
    keepSetting("completed", this.display.completed);
    if (change.completed) this.loader.reload(context);
  }

  /**
   * @param {ViewKey} view
   * @param {Context} context
   */
  show(view, context) {
    this.view = view;
    this.selection = new Selection();
    this.litId = this.hoveredControl = null;
    this.hints.clear();
    keepSetting("view", view);
    context.notify();
  }

  agent() {
    return pickAgent(this.agents, this.settings.agent);
  }

  /**
   * @param {KeyEvent} event
   * @param {Context} context
   */
  key(event, context) {
    if (this.loader.needsKey) return;
    if (this.detail) detailKey(this, this.detail, event, context);
    else listKey(this, event, context);
  }

  /**
   * @param {Issue} issue
   * @param {boolean} on
   * @param {Context} context
   */
  hover(issue, on, context) {
    const litId = on ? issue.id : this.litId === issue.id ? null : this.litId;
    if (litId === this.litId) return;
    this.litId = litId;
    context.notify();
  }

  /**
   * @param {Issue} issue
   * @param {boolean} extend
   * @param {Context} context
   */
  tick(issue, extend, context) {
    this.selection.click(issue.id, extend, this.visibleIds);
    context.notify();
  }

  // shortcut: Herdr scrolls to a child of the list only, which is a group, so in a group taller than the list the lit
  // row can stay out of sight; reveal the row itself if Herdr ever scrolls to a nested child
  /**
   * @param {1 | -1} by
   * @param {Context} context
   */
  moveCursor(by, context) {
    const ids = this.visibleIds;
    if (!ids.length) return;
    const from = this.litId === null ? -1 : ids.indexOf(this.litId);
    const to = from < 0 ? (by > 0 ? 0 : ids.length - 1) : Math.min(ids.length - 1, Math.max(0, from + by));
    const id = ids[to] ?? null;
    this.litId = id;
    this.scroll.scroll_to_item(this.sections()
      .findIndex((group) => group.issues.some((issue) => issue.id === id)));
    context.notify();
  }

  /**
   * @param {string} id
   * @param {boolean} on
   * @param {Context} context
   */
  hoverControl(id, on, context) {
    const hoveredControl = on ? id : this.hoveredControl === id ? null : this.hoveredControl;
    if (hoveredControl === this.hoveredControl) return;
    this.hoveredControl = hoveredControl;
    context.notify();
  }

  // The tooltip of an issue's status mark tells its stays in each status
  /**
   * @param {Issue} issue
   * @param {Context} context
   */
  loadStatusHistory(issue, context) {
    this.requests.settle(this.store.loadStatusHistory(issue), "the status history", context);
  }

  // The tooltip of a row's cycle tells the points planned in a cycle to come
  /**
   * @param {Cycle} cycle
   * @param {Context} context
   */
  loadPlannedPoints(cycle, context) {
    this.requests.settle(this.store.loadPlannedPoints(cycle, this.loader.loadedAt), "the planned points", context);
  }

  // The tooltip of a row's merge requests tells what they changed and who reviewed them
  /**
   * @param {Issue} issue
   * @param {Context} context
   */
  loadMergeDetails(issue, context) {
    this.requests.settle(this.store.loadMergeDetails(issue, this.loader.loadedAt), "the merge request details",
      context);
  }

  // Answers whether it asked: the labels are not there for a picker until the answer comes
  /**
   * @param {string} team
   * @param {Context} context
   */
  loadLabels(team, context) {
    const pending = this.store.loadLabels(team);
    this.requests.settle(pending, "the labels", context);
    return pending !== undefined;
  }

  /**
   * @param {Group} group
   * @param {Context} context
   */
  fold(group, context) {
    const name = group.state.name;
    if (!this.folded.delete(name)) {
      this.folded.add(name);
      this.selection.untick(group.issues.map((issue) => issue.id));
    }
    keepSetting("folded", JSON.stringify([...this.folded]));
    context.notify();
  }

  /** @param {Context} context */
  switchTotals(context) {
    this.totals = this.totals === "count" ? "points" : "count";
    keepSetting("totals", this.totals);
    context.notify();
  }

  // Makes an element of a row or a heading a control of its own: a press on it gives the panel the keyboard, is not
  // the start of a drag, and ends one left hanging by a release outside the panel. `action(context, event)` runs on a
  // click
  /**
   * @param {NativeElement} element
   * @param {(context: Context, event: ClickEvent) => void} action
   */
  control(element, action) {
    return element
      .on_mouse_down("left",
        (event, context) => {
          context.stop_propagation();
          this.hints.press(context);
          this.handle.focus();
          if (this.detail) this.detail.commentHasKeyboard = false;
          this.drag.cancel();
          this.pressedAt = event.position;
          this.pressedBounds = event.bounds;
        })
      .on_click((event, context) => { context.stop_propagation(); action(context, event); });
  }

  /**
   * @param {Group} group
   * @param {Context} context
   */
  aim(group, context) {
    if (this.drag.pressed === null) return;
    const isOwnGroup = this.store.index()
      .get(this.drag.pressed)?.state.name === group.state.name;
    if (this.drag.aim(group.state.name, isOwnGroup)) context.notify();
  }

  // A release on a row. Where the press began, before the pointer carried anything, it ends a click, which opens the
  // issue's page in the panel, or with the command key held, in the tracker. Otherwise it is a drop
  /**
   * @param {Issue} issue
   * @param {Group} group
   * @param {Context} context
   * @param {MouseButtonEvent} event
   */
  release(issue, group, context, event) {
    if (!this.drag.clicked(issue.id)) return this.drop(group, context);
    this.drag.cancel();
    if (commandDown(event.modifiers, isMac())) openPage(issue.url);
    else this.openDetail(issue, context);
  }

  // Slides the issue's page in from the right: it is drawn first at the panel's edge, and a moment later where it
  // stays, which is what the page's transition animates
  /**
   * @param {Issue} issue
   * @param {Context} context
   */
  openDetail(issue, context) {
    this.hints.clear();
    const page = new IssuePage(this, issue, context);
    this.detail = page;
    this.loadLabels(issue.team.id, context);
    context.notify();
    context.timer.after(DETAIL_APPEAR_DELAY_MS, (context) => {
      if (this.detail !== page) return;
      page.shown = true;
      context.notify();
      context.timer.after(DETAIL_SETTLE_DELAY_MS, (context) => {
        if (this.detail !== page || !page.shown) return;
        page.settled = true;
        this.litId = this.hoveredControl = null;
        context.notify();
      });
    });
  }

  // shortcut: a comment's text tells no blur, so `commentHasKeyboard` ends on a press elsewhere only, not when a key of
  // Herdr moves the keyboard away; track its focus if Herdr ever reports it
  pageHasKeyboard() {
    return Boolean(this.detail && (this.detail.focusedFieldCount > 0 || this.detail.commentHasKeyboard));
  }

  /** @param {Context} context */
  closeDetail(context) {
    const page = this.detail;
    if (!page?.shown) return;
    page.shown = false;
    page.settled = false;
    this.hints.clear();
    context.notify();
    context.timer.after(DETAIL_RELEASE_DELAY_MS, (context) => {
      if (this.detail !== page || page.shown) return;
      page.release();
      this.detail = null;
      context.notify();
    });
  }

  /**
   * @param {Group} group
   * @param {Context} context
   */
  drop(group, context) {
    const pressed = this.drag.drop(), loaded = this.store.index();
    context.notify();
    if (pressed === null) return;
    const dragged = this.selection.has(pressed) ? this.selection.list() : [pressed];
    const ids = dragged.filter((id) => loaded.get(id)?.state.name !== group.state.name);
    if (ids.length) this.requests.perform({ kind: RequestKind.STATUS, ids, name: group.state.name }, context);
  }

  // A round button with an icon, a tooltip and a click: only the icon goes brighter under the pointer, not the circle
  // around it. A hover style does not recolor an icon, which takes its color when it is described: the panel notes
  // which button is under the pointer (`hoveredControl`). `ring` false leaves the circle without a border
  /**
   * @param {Theme} theme
   * @param {{ id: string, name: string, label: string, action: (context: Context) => void, caps?: string[],
   *   glyph?: number, size?: number, ring?: boolean, side?: Tip["side"] }} button
   */
  iconButton(theme, { id, name, label, action, caps = [], glyph = ICON_BUTTON_GLYPH_PX,
    size = Height.ICON_BUTTON, ring = true, side }) {
    const circle = roundButton(id, size)
      .when(ring, (element) => element.border_1()
        .border_color(theme.border));
    const hover = (/** @type {boolean} */ on, /** @type {Context} */ context) => this.hoverControl(id, on, context);
    return this.control(this.hints.on(circle, label, { caps, side, key: id, hover }), action)
      .child(svg(icon(name))
        .size(glyph)
        .text_color(lit(theme, this.hoveredControl === id || channel.litAnchor() === id)));
  }

  /**
   * @param {Theme} theme
   * @param {Context} context
   */
  render(theme, context) {
    this.hints.begin();
    // A popup open over the panel takes the pointer: no tooltip stays up or comes up meanwhile, since the control it
    // hangs from is never told the pointer left
    if (channel.popups().length) this.hints.clear();
    this.requests.serveAsked(context);
    this.retake(context);
    const sections = this.sections();
    this.visibleIds = sections.filter((group) => !this.folded.has(group.state.name))
      .flatMap((group) => group.issues.map((issue) => issue.id));
    return drawPanel(this, theme, sections);
  }
}

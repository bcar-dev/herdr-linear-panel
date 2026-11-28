// The panel: my issues by view, grouped by status, and everything that can be done to them from here.
// It draws what the store holds and wires the clicks and keys. The popups (see popups.js) only ask for it, through
// channel.js
import { div, image, svg } from "gpui-kit";
import { v_flex, h_flex, ScrollHandle } from "gpui-base";
import * as api from "../api.js";
import * as channel from "../channel.js";
import * as dock from "../dock.js";
import { knownAgents } from "herdr";
import { COMPLETED, HEADER_HEIGHT_PX, ERROR_TEXT_PX, ORDERINGS, RELOAD_EVERY_MS, VIEWS, icon, logo,
  shipped } from "../config.js";
import { Completed, Ordering, RequestKind, ViewKey } from "../enums.js";
import { NAME, isMac, openApp, openPage } from "../tracker.js";
import { chordCaps, lit, roundButton, zoom } from "../ui.js";
import { keepSetting, readSetting } from "../lib/cache.js";
import { isDark } from "../lib/color.js";
import { Drag } from "../lib/drag.js";
import { filters, groups, points } from "../lib/listing.js";
import { commandDown } from "../lib/keys.js";
import { textWidth } from "../lib/placement.js";
import { Selection } from "../lib/selection.js";
import { pickAgent } from "../lib/start.js";
import { estimateLabel } from "../lib/teams.js";
import { issuesName, message } from "../lib/text.js";
import { Hints } from "./hints.js";
import { Loader } from "./loader.js";
import { carried, section, warming } from "./issue-list.js";
import { IssuePage, SLIDE_MS } from "./issue-page.js";
import { Openers } from "./openers.js";
import { detailKey, listKey } from "./panel-keys.js";
import { MUTATES, carryOut, serve } from "./requests.js";
import { Setup } from "./setup.js";
import { Store } from "./store.js";

const CLEAR_BUTTON_GLYPH_PX = 13;
const CLEAR_BUTTON_SIZE_PX = 28;
const COLUMN_CHARACTER_WIDTH_PX = 7;
const DEFAULT_PANEL_WIDTH_PX = 368;
const DETAIL_APPEAR_DELAY_MS = 30;
const DETAIL_RELEASE_DELAY_MS = SLIDE_MS + 60;
const DETAIL_SETTLE_DELAY_MS = SLIDE_MS + 40;
const ICON_BUTTON_GLYPH_PX = 14;
const ICON_BUTTON_SIZE_PX = 26;
const ISLAND_HEIGHT_PX = 58;
const ISLAND_SLIDE_MS = 180;
const KEYBOARD_RETAKE_DELAYS_MS = [1, 8, 30];
const KEYBOARD_RETAKE_FINAL_DELAY_MS = 150;
const NEW_ISSUE_GLYPH_PX = 15;
const SPINNER_TURN_MS = 900;

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

// How wide the longest of the texts is, in pixels of a style
/** @param {string[]} texts */
const widest = (texts) => textWidth(
  texts.reduce((longest, text) => (text.length > longest.length ? text : longest), ""), COLUMN_CHARACTER_WIDTH_PX);

export class Panel {
  /** @type {Agent[]} the programs people can start, as Herdr knows them. Asked once: Herdr asks a shell for them */
  agents = [];
  /** @type {string | null} what the last change or lookup that failed said, until it is clicked away */
  failed = null;
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
    api.use(settings.api, (ms) => new Promise((resolve) => context.timer.after(ms, () => resolve())));
    context.spawn(async (context) => {
      try {
        this.agents = await knownAgents();
      } catch (error) {
        this.failed = `Could not list the agents: ${message(error)}`;
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
    // A request left over from before a restart or reload is not replayed
    this.lastServedRequestAt = channel.pending()?.at ?? 0;
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
    this.store.forgetAsked();
    this.loader.reload(context);
  }

  /** @param {Context} context */
  async load(context) {
    const { store } = this;
    const viewer = await api.issues(filters(this.display.completed, Date.now()));
    store.apply(viewer);
    this.selection.keep(new Set(store.issues[this.view].map((issue) => issue.id)));
    this.settle(store.loadProjects(), "the projects", context);
    // The issues wait for the teams never seen; the others show with what was kept, and are updated when the answer
    // comes
    const unseen = store.unseenTeams(), teams = store.loadTeams();
    if (!teams) return;
    if (unseen) return teams;
    this.settle(teams, "the teams", context);
  }

  // Lets what was asked end on its own: a failure is shown, and asked again the next time it is needed
  /**
   * @param {Promise<unknown> | undefined} pending
   * @param {string} what
   * @param {Context} context
   */
  settle(pending, what, context) {
    if (!pending) return;
    context.spawn(async (context) => {
      try {
        await pending;
      } catch (error) {
        this.failed = `Could not load ${what}: ${message(error)}`;
      }
      context.notify();
    });
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
    const take = () => { if (!channel.popups().length && !this.detail?.edited) this.handle.focus(); };
    for (const wait of KEYBOARD_RETAKE_DELAYS_MS) context.timer.after(wait, take);
    context.timer.after(KEYBOARD_RETAKE_FINAL_DELAY_MS, (context) => {
      take();
      this.retaking = false;
      context.notify();
    });
  }

  /** @param {Context} context */
  serve(context) {
    for (const request of channel.requestsAfter(this.lastServedRequestAt)) {
      this.lastServedRequestAt = request.at;
      serve(this, request, context);
    }
  }

  /**
   * @param {import("./requests.js").Performed} request
   * @param {Context} context
   * @param {() => void} [undo] runs when the tracker refuses the change
   */
  perform(request, context, undo) {
    const loaded = this.store.index(), page = this.detail?.issue;
    const targets = request.ids.flatMap((id) => loaded.get(id) ?? (page?.id === id ? page : []));
    if (!targets.length) return;
    const name = issuesName(targets);
    const changes = MUTATES[request.kind];
    // With a page open, the list is out of sight: the change is read back quietly
    const quiet = Boolean(this.detail);
    if (changes) this.loader.begin(quiet);
    this.failed = null;
    context.spawn(async (context) => {
      try {
        await carryOut(this, request, targets, context);
      } catch (error) {
        this.failed = `${name}: ${message(error)}`;
        undo?.();
      } finally {
        if (changes) {
          this.loader.end();
          if (quiet) this.loader.reloadQuietly(context);
          else this.loader.reload(context);
        }
        context.notify();
      }
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

  // The arrow keys move the lit row through the issues shown, from the lit one, else from the first or the last.
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
    this.settle(this.store.loadStatusHistory(issue), "the status history", context);
  }

  // The tooltip of a row's cycle tells the points planned in a cycle to come
  /**
   * @param {Cycle} cycle
   * @param {Context} context
   */
  loadPlannedPoints(cycle, context) {
    this.settle(this.store.loadPlannedPoints(cycle, this.loader.loadedAt), "the planned points", context);
  }

  // The tooltip of a row's merge requests tells what they changed and who reviewed them
  /**
   * @param {Issue} issue
   * @param {Context} context
   */
  loadMergeDetails(issue, context) {
    this.settle(this.store.loadMergeDetails(issue, this.loader.loadedAt), "the merge request details", context);
  }

  // Answers whether it asked: the labels are not there for a picker until the answer comes
  /**
   * @param {string} team
   * @param {Context} context
   */
  loadLabels(team, context) {
    const pending = this.store.loadLabels(team);
    this.settle(pending, "the labels", context);
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
   * @param {Extract<Work, { kind: "comment" }>} request
   * @param {Context} context
   */
  changeComment({ change, comment, extra }, context) {
    const page = this.detail;
    if (!page) return;
    if (change === "confirm-delete") return this.openers.confirmDelete(page, comment);
    if (change === "start-edit") {
      return context.timer.after(0, (context) => {
        try {
          this.hints.clear();
          page.startEdit(comment, context);
        } catch (error) {
          this.failed = `${page.issue.identifier}: ${message(error)}`;
          context.notify();
        }
      });
    }
    this.trackedWork(() => api.changeComment(change, comment, extra), page.issue, context,
      (context) => page.load(context));
  }

  // Work of the page that is not an update (a comment): with the spinner, like a change. `then` runs once it is done
  /**
   * @param {() => Promise<unknown>} task
   * @param {Issue} issue
   * @param {Context} context
   * @param {(context: Context) => void} then
   */
  trackedWork(task, issue, context, then) {
    this.loader.begin();
    this.failed = null;
    context.spawn(async (context) => {
      try {
        await task();
        then(context);
      } catch (error) {
        this.failed = `${issue.identifier}: ${message(error)}`;
      } finally {
        this.loader.end();
        this.loader.unspin(context);
        context.notify();
      }
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
    if (ids.length) this.perform({ kind: RequestKind.STATUS, ids, name: group.state.name }, context);
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
    size = ICON_BUTTON_SIZE_PX, ring = true, side }) {
    const circle = roundButton(id, size)
      .when(ring, (element) => element.border_1()
        .border_color(theme.border));
    const hover = (/** @type {boolean} */ on, /** @type {Context} */ context) => this.hoverControl(id, on, context);
    return this.control(this.hints.on(circle, label, { caps, side, key: id, hover }), action)
      .child(svg(icon(name))
        .size(glyph)
        .text_color(lit(theme, this.hoveredControl === id || channel.litAnchor() === id)));
  }

  /** @param {Theme} theme */
  reloadButton(theme) {
    return this.iconButton(theme, { id: "reload", label: "Reload", caps: ["R"], name: "refresh",
      action: (context) => { this.refresh(context); context.notify(); } });
  }

  /** @param {Theme} theme */
  header(theme) {
    const home = div()
      .id("home")
      .h(28)
      .px(8)
      .gap(6)
      .flex_none()
      .flex()
      .items_center()
      .rounded(14)
      .cursor_pointer()
      .font_semibold()
      .hover((style) => style.bg(theme.hover))
      .on_click(() => { openApp(); });
    return h_flex()
      .h(HEADER_HEIGHT_PX)
      .flex_none()
      .pl(8)
      .pr(14)
      .gap(8)
      .items_center()
      .border_b(1)
      .border_color(theme.border)
      .child(this.hints.on(home, `Open ${NAME}`)
        .child(image(logo(isDark(theme.background)))
          .size(14)
          .flex_none())
        .child(NAME))
      .child(div()
        .flex_1())
      .when(this.loader.needsKey, (element) => element
        .child(this.reloadButton(theme)));
  }

  // A click on the pill cannot reach a row behind it: it has its own strip under the list. The strip is always there,
  // flat while nothing is ticked: its height is what Herdr animates, and the pill, hung from its top, rises from below
  /** @param {Theme} theme */
  island(theme) {
    const strip = h_flex()
      .id("island")
      .flex_none()
      .h(this.selection.size > 0 ? ISLAND_HEIGHT_PX : 0)
      .overflow_hidden()
      .items_start()
      .justify_center()
      .transition("height", { duration: ISLAND_SLIDE_MS, easing: "ease-out" });
    if (!this.selection.size) return strip;
    const targets = this.ticked(), total = points(targets, this.store.teams);
    const actions = h_flex()
      .id("actions")
      .h(28)
      .px(11)
      .gap(6)
      .flex_none()
      .items_center()
      .rounded(14)
      .cursor_pointer()
      .bg(theme.raised)
      .border_1()
      .border_color(theme.border)
      .text_color(theme.foreground)
      .hover((style) => style.bg(theme.hover))
      .on_click(() => this.openers.commands());
    const untick = this.iconButton(theme, { id: "untick", name: "close", label: "Clear selected", caps: ["Esc"],
      glyph: CLEAR_BUTTON_GLYPH_PX, size: CLEAR_BUTTON_SIZE_PX, ring: false, side: "above",
      action: (context) => { this.selection.clear(); this.hints.clear(); context.notify(); } });
    return strip
      .child(h_flex()
        .h(42)
        .mt(8)
        .pl(16)
        .pr(7)
        .gap(10)
        .items_center()
        .rounded(21)
        .bg(theme.popover)
        .border_1()
        .border_color(theme.border)
        .shadow_md()
        .text_size(12.5)
        .child(div()
          .flex_none()
          .text_color(theme.foreground)
          .child(`${targets.length} selected`))
        .when(total > 0, (element) => element
          .child(div()
            .text_color(theme.dim)
            .child("·"))
          .child(h_flex()
            .flex_none()
            .gap(3)
            .items_center()
            .text_color(theme.muted)
            .child(svg(icon("estimate"))
              .size(13))
            .child(String(total))))
        .child(this.hints.on(actions, "Open command menu", { caps: chordCaps(["K"]), side: "above" })
          .child(svg(icon("command"))
            .size(13))
          .child("Actions"))
        .child(untick));
  }

  /**
   * @param {Theme} theme
   * @param {IssuePage} page
   */
  page(theme, page) {
    const width = this.frame ? this.frame.width / zoom() : DEFAULT_PANEL_WIDTH_PX;
    const issue = this.store.index()
      .get(page.issue.id) ?? page.issue;
    return page.render(theme, issue, width, (context) => this.closeDetail(context));
  }

  // The total of the view, in the mode the groups' totals are in: the number of issues, or their estimates. Like
  // theirs, it brightens under the pointer, and a click switches the mode of all of them
  /**
   * @param {Theme} theme
   * @param {Issue[]} issues
   */
  totalButton(theme, issues) {
    const counting = this.totals === "count", cut = this.store.more[this.view];
    return this.control(warming(this, h_flex()
      .h(22)
      .px(5)
      .flex_none()
      .gap(3)
      .items_center()
      .rounded(5)
      .cursor_pointer()
      .text_size(12), "total-view", theme.muted, theme.foreground), (context) => this.switchTotals(context))
      .when(!counting, (element) => element.child(svg(icon("estimate"))
        .size(14)))
      .child(counting ? `${issues.length}${cut ? "+" : ""} ${issues.length === 1 && !cut ? "issue" : "issues"}`
      : String(points(issues, this.store.teams)));
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
    this.serve(context);
    this.retake(context);
    // A page that has slid in covers the list, which is then not drawn: it would still answer the pointer
    const covered = Boolean(this.detail?.settled);
    const { store } = this, issues = store.issues[this.view], sections = this.sections();
    this.visibleIds = sections.filter((group) => !this.folded.has(group.state.name))
      .flatMap((group) => group.issues.map((issue) => issue.id));
    const look = {
      theme,
      identifierWidth: widest(issues.map((issue) => issue.identifier)),
      estimateWidth: widest(issues.map((issue) => estimateLabel(store.teams.get(issue.team.id), issue.estimate) ?? "")),
      lit: channel.lit(),
    };
    const empty = this.loader.loading ? "Loading issues…"
      : this.view === ViewKey.CYCLE ? "No issues in the current cycle" : "No assigned issues";
    /**
     * @param {string} text
     * @param {Color} color
     */
    const note = (text, color) => div()
      .flex_none()
      .px(16)
      .text_size(ERROR_TEXT_PX)
      .text_color(color)
      .child(text);
    /**
     * @param {typeof VIEWS[number]} entry
     * @param {number} nth
     */
    const pill = ({ id: view, label, icon: name }, nth) => this.hints.on(
      h_flex()
        .id(`view-${view}`)
        .h(28)
        .px(11)
        .gap(6)
        .flex_none()
        .items_center()
        .rounded(7)
        .cursor_pointer()
        .text_size(13)
        .bg(this.view === view ? theme.selected : theme.background)
        .text_color(this.view === view ? theme.foreground : theme.muted)
        .when(this.view !== view, (element) => element.hover((style) => style.bg(theme.hover)))
        .on_click((_event, context) => this.show(view, context))
        .child(svg(icon(name))
          .size(14)
          .flex_none())
        .child(label),
      label, { caps: [String(nth + 1)] });
    /**
     * @param {MouseButtonEvent} _event
     * @param {Context} context
     */
    const endDrag = (_event, context) => { if (this.drag.cancel()) context.notify(); };
    return v_flex()
      .id("issues-panel")
      .relative()
      .track_focus(this.handle)
      .focus((style) => style.border_color(theme.accent))
      .on_key_down((event, context) => {
        this.hints.keys(event.modifiers, event.key, context);
        this.key(event, context);
      })
      .on_key_up((event, context) => this.hints.keys(event.modifiers, null, context))
      .on_modifiers_changed((event, context) => this.hints.keys(event.modifiers, null, context))
      .size_full()
      .min_h(0)
      .rounded(10)
      .overflow_hidden()
      .bg(theme.background)
      .border_1()
      .border_color(theme.border)
      .text_color(theme.foreground)
      .text_size(13)
      // A popup opened from the panel has the keyboard for a moment: the panel keeps its focused look meanwhile, and
      // while it takes the keyboard back
      .when(channel.popups().length > 0 || this.retaking || this.pageHasKeyboard(),
        (element) => element.border_color(theme.accent))
      .on_mouse_up("left", endDrag)
      .on_mouse_down_out(endDrag)
      .on_mouse_down_out((_event, context) => {
        if (!this.detail?.commentHasKeyboard) return;
        this.detail.commentHasKeyboard = false;
        context.notify();
      })
      .on_mouse_down("left", () => { this.handle.focus(); this.drag.settle(); })
      .on_mouse_down("right", () => this.handle.focus())
      .on_mouse_move((event, context) => {
        this.frame = event.bounds;
        this.pointer = event.position;
        if (this.drag.follow(event.position, event.local_position)) context.notify();
      })
      .when(this.loader.needsKey, (element) => element.child(this.header(theme)))
      .when(this.loader.needsKey, (element) => element.child(this.setup.render(theme)))
      .when(!this.loader.needsKey && !covered, (element) => element
        .child(h_flex()
          .flex_none()
          .px(8)
          .pt(8)
          .pb(6)
          .gap(4)
          .items_center()
          .children(VIEWS.map(pill))
          .child(div()
            .flex_1())
          .child(this.iconButton(theme, { id: "new-issue", label: "Create new issue", caps: ["C"], name: "create",
            glyph: NEW_ISSUE_GLYPH_PX, action: () => this.openers.compose() }))
          .child(this.iconButton(theme, { id: "display-options", label: "Show display options", caps: ["⇧", "V"],
            name: "display", action: () => this.openers.displayOptions() }))
          .child(this.reloadButton(theme)))
        .child(h_flex()
          .flex_none()
          .px(11)
          .items_center()
          .child(this.totalButton(theme, issues)))
        .children(this.loader.loadError ? [note(this.loader.loadError, theme.ansi1)] : [])
        .children(this.failed ? [note(this.failed, theme.ansi1)
          .id("failed")
          .cursor_pointer()
          .on_click((_event, context) => { this.failed = null; context.notify(); })] : [])
        .child(v_flex()
          .id("issues")
          .flex_1()
          .min_h(0)
          .overflow_y_scrollbar()
          .track_scroll(this.scroll)
          .px(6)
          .pb(6)
          .children(sections.map((group) => section(this, group, look)))
          .when(!issues.length && !this.loader.loadError, (element) =>
            element.child(div()
              .p(8)
              .text_size(12)
              .text_color(theme.dim)
              .child(empty)))
          .when(Boolean(store.more[this.view]), (element) => element.child(div()
            .p(8)
            .text_size(11)
            .text_color(theme.dim)
            .child(`Showing the first ${api.ISSUES_PER_VIEW} issues`))))
        .child(this.island(theme)))
      .children(this.detail ? [this.page(theme, this.detail)] : [])
      .when(this.loader.spinning, (element) => element
        .child(div()
          .absolute()
          .inset_0()
          .flex()
          .items_center()
          .justify_center()
          .child(div()
            .size(40)
            .flex()
            .items_center()
            .justify_center()
            .rounded(20)
            .bg(theme.popover)
            .border_1()
            .border_color(theme.border)
            .shadow_md()
            .child(svg(shipped("spinner"))
              .size(18)
              .text_color(theme.muted)
              .spin(SPINNER_TURN_MS)))))
      .children(this.hints.showing() && this.frame ? [this.hints.draw(theme, this.frame)] : [])
      .when(this.drag.carrying, (element) => element.child(carried(this, theme)));
  }
}

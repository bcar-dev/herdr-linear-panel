// The panel: my issues by view, grouped by status, and everything that can be done to them from here.
// It draws what the store holds and wires the clicks and keys. The popups (see popups.js) only ask for it, through
// channel.js
import { div, image, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import * as api from "../api.js";
import * as channel from "../channel.js";
import * as dock from "../dock.js";
import { knownAgents } from "herdr";
import { COMPLETED, HEADER_HEIGHT_PX, MIN_SPIN_MS, ORDERINGS, RELOAD_EVERY_MS, VIEWS, icon, logo,
  shipped } from "../config.js";
import { Completed, Ordering, RequestKind, ViewKey } from "../enums.js";
import { NAME, isMac, openApp, openPage } from "../tracker.js";
import { chordCaps, lit, roundButton, zoom } from "../ui.js";
import { isDark } from "../lib/color.js";
import { Drag } from "../lib/drag.js";
import { filters, groups, points } from "../lib/listing.js";
import { commandDown } from "../lib/keys.js";
import { textWidth } from "../lib/placement.js";
import { Selection } from "../lib/selection.js";
import { pickAgent } from "../lib/start.js";
import { estimateLabel } from "../lib/teams.js";
import { message } from "../lib/text.js";
import { Hints } from "./hints.js";
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
const LOAD_TIMEOUT_MS = 30_000;
const NEW_ISSUE_GLYPH_PX = 15;
const SPINNER_TURN_MS = 900;

// The stored value when it is the id of one of the options
/**
 * @template {string} T
 * @param {string} name
 * @param {NamedOption<T>[]} options
 */
const stored = (name, options) => options.find(({ id }) => id === localStorage.getItem(name))?.id;

// The stored list of names, or none when nothing readable is stored
/** @param {string} name */
function storedNames(name) {
  try {
    const names = JSON.parse(localStorage.getItem(name) ?? "[]");
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
  again = false;
  /** @type {string | null} */
  error = null;
  /** @type {string | null} what the last change or lookup that failed said, until it is clicked away */
  failed = null;
  /** @type {Bounds | undefined} the panel's bounds in the window, as the pointer last told */
  frame;
  /** @type {IssuePage | null} */
  detail = null;
  /** @type {string | null} */
  hot = null;
  /** @type {string | null} */
  hovered = null;
  loadAttempt = 0;
  loadedAt = 0;
  loading = false;
  needsKey = false;
  /** @type {Point | undefined} */
  pointer;
  /** @type {Point | undefined} where the last control was pressed */
  pressedAt;
  /** @type {Bounds | undefined} */
  pressedBounds;
  // The panel keeps its focused look while it takes the keyboard back from a popup
  retaking = false;
  spinning = false;
  spunAt = 0;
  /** @type {string[]} the issues in the order drawn, for a Shift+click to span: not those of a folded group */
  visibleIds = [];
  working = 0;

  /**
   * @param {PanelProps} settings
   * @param {Context} cx
   */
  constructor(settings, cx) {
    this.settings = settings;
    api.use(settings.api);
    cx.spawn(async (cx) => {
      try {
        this.agents = await knownAgents();
      } catch (error) {
        this.failed = `Could not list the agents: ${message(error)}`;
      }
      cx.notify();
    });
    this.view = stored("view", VIEWS) ?? VIEWS[0].id;
    this.display = {
      by: stored("order", ORDERINGS) ?? Ordering.PRIORITY,
      reversed: localStorage.getItem("reversed") === "1",
      recency: localStorage.getItem("recency") !== "0",
      completed: stored("completed", COMPLETED) ?? Completed.WEEK,
    };
    this.totals = localStorage.getItem("totals") === "count" ? "count" : "points";
    this.folded = new Set(storedNames("folded"));
    this.store = new Store();
    this.openers = new Openers(this);
    this.selection = new Selection();
    this.drag = new Drag();
    this.hints = new Hints(() => channel.popups().length > 0);
    this.setup = new Setup();
    this.handle = cx.focus_handle();
    channel.reset();
    this.keyboardAt = channel.givenBack();
    // A request left over from before a restart or reload is not replayed
    this.lastServedRequestAt = channel.pending()?.at ?? 0;
    this.poll(cx);
    cx.timer.every(RELOAD_EVERY_MS, (cx) => this.poll(cx));
  }

  // The first load shows a spinner, a catch-up does not
  /** @param {Context} cx */
  poll(cx) {
    if (!dock.isShown()) return;
    if (this.loadedAt === 0) this.reload(cx);
    else this.reloadQuietly(cx);
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

  spin() {
    if (this.spinning) return;
    this.spinning = true;
    this.spunAt = Date.now();
  }

  // Stops the spinner once it has shown long enough, unless a load or a change is still under way: a quiet reload
  // that ends must not hide the spinner of a change that has not
  /** @param {Context} cx */
  unspin(cx) {
    const idle = () => !this.loading && !this.working;
    if (!idle()) return;
    const rest = this.spunAt + MIN_SPIN_MS - Date.now();
    if (rest > 0) cx.timer.after(rest, (cx) => { if (idle()) { this.spinning = false; cx.notify(); } });
    else this.spinning = false;
  }

  // A click or a key that asks for a reload must cx.notify() to show the spinner
  /** @param {Context} cx */
  reload(cx) {
    this.spin();
    this.#reload(cx);
  }

  // For reloads nobody asked for (the timer, the read back of a change under a page): they show no spinner
  /** @param {Context} cx */
  reloadQuietly(cx) {
    this.#reload(cx);
  }

  // A load that has not answered in time is given up: the host has no way to cancel a request, so its answer, when it
  // comes, is ignored
  /** @param {Context} cx */
  #reload(cx) {
    if (this.loading) { this.again = true; return; }
    this.loading = true;
    this.loadedAt = Date.now();
    const attempt = ++this.loadAttempt;
    cx.timer.after(LOAD_TIMEOUT_MS, (cx) => {
      if (this.loading && attempt === this.loadAttempt) this.endLoad(new Error(`${NAME} did not answer in time`), cx);
    });
    cx.spawn(async (cx) => {
      /** @type {unknown} */
      let failure;
      try {
        await this.load(attempt, cx);
      } catch (error) {
        failure = error;
      }
      if (this.loading && attempt === this.loadAttempt) this.endLoad(failure, cx);
    });
  }

  /**
   * @param {unknown} failure undefined when the load went well
   * @param {Context} cx
   */
  endLoad(failure, cx) {
    this.needsKey = failure instanceof api.NoKey;
    this.error = failure === undefined || this.needsKey ? null : message(failure);
    this.loading = false;
    if (this.again) { this.again = false; this.reloadQuietly(cx); }
    else if (this.spinning) this.unspin(cx);
    cx.notify();
  }

  /**
   * @param {number} attempt
   * @param {Context} cx
   */
  async load(attempt, cx) {
    const { store } = this;
    const viewer = await api.issues(filters(this.display.completed, Date.now()));
    if (attempt !== this.loadAttempt) return;
    store.apply(viewer);
    this.selection.keep(new Set(store.issues[this.view].map((issue) => issue.id)));
    this.settle(store.loadProjects(), "the projects", cx);
    // The issues wait for the teams never seen; the others show with what was kept, and are updated when the answer
    // comes
    const unseen = store.unseenTeams(), teams = store.loadTeams();
    if (!teams) return;
    if (unseen) return teams;
    this.settle(teams, "the teams", cx);
  }

  // Lets what was asked end on its own: a failure is shown, and asked again the next time it is needed
  /**
   * @param {Promise<unknown> | undefined} pending
   * @param {string} what
   * @param {Context} cx
   */
  settle(pending, what, cx) {
    if (!pending) return;
    cx.spawn(async (cx) => {
      try {
        await pending;
      } catch (error) {
        this.failed = `Could not load ${what}: ${message(error)}`;
      }
      cx.notify();
    });
  }

  // Takes the keyboard back once a popup opened from the panel has gone (channel.js), unless another popup is still
  // open. Herdr hands the keyboard to the terminal a few milliseconds after a popup closes, whoever had it before:
  // the panel takes it again right after, several times because the moment is not known. It cannot take it here,
  // while drawing. Meanwhile it keeps its focused look (`retaking`), so its outline does not blink. The first tries
  // come sooner than `focusSoon` goes, and the last one ends the look
  /** @param {Context} cx */
  retake(cx) {
    const at = channel.givenBack();
    if (!at || at === this.keyboardAt) return;
    this.keyboardAt = at;
    this.retaking = true;
    const take = () => { if (!channel.popups().length && !this.detail?.edited) this.handle.focus(); };
    for (const wait of KEYBOARD_RETAKE_DELAYS_MS) cx.timer.after(wait, take);
    cx.timer.after(KEYBOARD_RETAKE_FINAL_DELAY_MS, (cx) => { take(); this.retaking = false; cx.notify(); });
  }

  /** @param {Context} cx */
  serve(cx) {
    for (const request of channel.requestsAfter(this.lastServedRequestAt)) {
      this.lastServedRequestAt = request.at;
      serve(this, request, cx);
    }
  }

  /**
   * @param {import("./requests.js").Performed} request
   * @param {Context} cx
   * @param {() => void} [undo] runs when the tracker refuses the change
   */
  perform(request, cx, undo) {
    const loaded = this.store.index(), page = this.detail?.issue;
    const targets = request.ids.flatMap((id) => loaded.get(id) ?? (page?.id === id ? page : []));
    if (!targets.length) return;
    const name = targets.length === 1 ? targets[0].identifier : `${targets.length} issues`;
    const changes = MUTATES[request.kind];
    // With a page open, the list is out of sight: the change is read back quietly
    const quiet = Boolean(this.detail);
    if (changes) {
      if (!quiet) this.spin();
      this.working++;
    }
    this.failed = null;
    cx.spawn(async (cx) => {
      try {
        await carryOut(this, request, targets, cx);
      } catch (error) {
        this.failed = `${name}: ${message(error)}`;
        undo?.();
      } finally {
        if (changes) {
          this.working--;
          if (quiet) this.reloadQuietly(cx);
          else this.reload(cx);
        }
        cx.notify();
      }
    });
  }

  /**
   * @param {Partial<Display>} change
   * @param {Context} cx
   */
  redisplay(change, cx) {
    Object.assign(this.display, change);
    localStorage.setItem("order", this.display.by);
    localStorage.setItem("reversed", this.display.reversed ? "1" : "0");
    localStorage.setItem("recency", this.display.recency ? "1" : "0");
    localStorage.setItem("completed", this.display.completed);
    if (change.completed) this.reload(cx);
  }

  /**
   * @param {ViewKey} view
   * @param {Context} cx
   */
  show(view, cx) {
    this.view = view;
    this.selection = new Selection();
    this.hovered = this.hot = null;
    this.hints.clear();
    localStorage.setItem("view", view);
    cx.notify();
  }

  agent() {
    return pickAgent(this.agents, this.settings.agent);
  }

  /**
   * @param {KeyEvent} event
   * @param {Context} cx
   */
  key(event, cx) {
    if (this.needsKey) return;
    if (this.detail) detailKey(this, this.detail, event, cx);
    else listKey(this, event, cx);
  }

  /**
   * @param {Issue} issue
   * @param {boolean} on
   * @param {Context} cx
   */
  hover(issue, on, cx) {
    const hovered = on ? issue.id : this.hovered === issue.id ? null : this.hovered;
    if (hovered === this.hovered) return;
    this.hovered = hovered;
    cx.notify();
  }

  /**
   * @param {Issue} issue
   * @param {boolean} extend
   * @param {Context} cx
   */
  tick(issue, extend, cx) {
    this.selection.click(issue.id, extend, this.visibleIds);
    cx.notify();
  }

  /**
   * @param {string} id
   * @param {boolean} on
   * @param {Context} cx
   */
  heat(id, on, cx) {
    const hot = on ? id : this.hot === id ? null : this.hot;
    if (hot === this.hot) return;
    this.hot = hot;
    cx.notify();
  }

  // The tooltip of an issue's status mark tells its stays in each status
  /**
   * @param {Issue} issue
   * @param {Context} cx
   */
  loadStatusHistory(issue, cx) {
    this.settle(this.store.loadStatusHistory(issue), "the status history", cx);
  }

  // The tooltip of a row's cycle tells the points planned in a cycle to come
  /**
   * @param {Cycle} cycle
   * @param {Context} cx
   */
  loadPlannedPoints(cycle, cx) {
    this.settle(this.store.loadPlannedPoints(cycle, this.loadedAt), "the planned points", cx);
  }

  // The tooltip of a row's merge requests tells what they changed and who reviewed them
  /**
   * @param {Issue} issue
   * @param {Context} cx
   */
  loadMergeDetails(issue, cx) {
    this.settle(this.store.loadMergeDetails(issue, this.loadedAt), "the merge request details", cx);
  }

  // Answers whether it asked: the labels are not there for a picker until the answer comes
  /**
   * @param {string} team
   * @param {Context} cx
   */
  loadLabels(team, cx) {
    const pending = this.store.loadLabels(team);
    this.settle(pending, "the labels", cx);
    return pending !== undefined;
  }

  /**
   * @param {Group} group
   * @param {Context} cx
   */
  fold(group, cx) {
    const name = group.state.name;
    if (!this.folded.delete(name)) {
      this.folded.add(name);
      this.selection.untick(group.issues.map((issue) => issue.id));
    }
    localStorage.setItem("folded", JSON.stringify([...this.folded]));
    cx.notify();
  }

  /** @param {Context} cx */
  switchTotals(cx) {
    this.totals = this.totals === "count" ? "points" : "count";
    localStorage.setItem("totals", this.totals);
    cx.notify();
  }

  // Makes an element of a row or a heading a control of its own: a press on it gives the panel the keyboard, is not
  // the start of a drag, and ends one left hanging by a release outside the panel. `action(cx, event)` runs on a click
  /**
   * @param {NativeElement} element
   * @param {(cx: Context, event: ClickEvent) => void} action
   */
  control(element, action) {
    return element
      .on_mouse_down("left",
        (event, cx) => {
          cx.stop_propagation();
          this.hints.press(cx);
          this.handle.focus();
          if (this.detail) this.detail.commentHasKeyboard = false;
          this.drag.cancel();
          this.pressedAt = event.position;
          this.pressedBounds = event.bounds;
        })
      .on_click((event, cx) => { cx.stop_propagation(); action(cx, event); });
  }

  /**
   * @param {Group} group
   * @param {Context} cx
   */
  aim(group, cx) {
    if (this.drag.pressed === null) return;
    const own = this.store.index()
      .get(this.drag.pressed)?.state.name === group.state.name;
    if (this.drag.aim(group.state.name, own)) cx.notify();
  }

  // A release on a row. Where the press began, before the pointer carried anything, it ends a click, which opens the
  // issue's page in the panel, or with the command key held, in the tracker. Otherwise it is a drop
  /**
   * @param {Issue} issue
   * @param {Group} group
   * @param {Context} cx
   * @param {MouseButtonEvent} event
   */
  release(issue, group, cx, event) {
    if (!this.drag.clicked(issue.id)) return this.drop(group, cx);
    this.drag.cancel();
    if (commandDown(event.modifiers, isMac())) openPage(issue.url);
    else this.openDetail(issue, cx);
  }

  // Slides the issue's page in from the right: it is drawn first at the panel's edge, and a moment later where it
  // stays, which is what the page's transition animates
  /**
   * @param {Issue} issue
   * @param {Context} cx
   */
  openDetail(issue, cx) {
    this.hints.clear();
    const page = new IssuePage(this, issue, cx);
    this.detail = page;
    this.loadLabels(issue.team.id, cx);
    cx.notify();
    cx.timer.after(DETAIL_APPEAR_DELAY_MS, (cx) => {
      if (this.detail !== page) return;
      page.shown = true;
      cx.notify();
      cx.timer.after(DETAIL_SETTLE_DELAY_MS, (cx) => {
        if (this.detail !== page || !page.shown) return;
        page.settled = true;
        this.hovered = this.hot = null;
        cx.notify();
      });
    });
  }

  // shortcut: a comment's text tells no blur, so `commentHasKeyboard` ends on a press elsewhere only, not when a key of
  // Herdr moves the keyboard away; track its focus if Herdr ever reports it
  pageHasKeyboard() {
    return Boolean(this.detail && (this.detail.focusedFieldCount > 0 || this.detail.commentHasKeyboard));
  }

  /** @param {Context} cx */
  closeDetail(cx) {
    const page = this.detail;
    if (!page?.shown) return;
    page.shown = false;
    page.settled = false;
    this.hints.clear();
    cx.notify();
    cx.timer.after(DETAIL_RELEASE_DELAY_MS, (cx) => {
      if (this.detail !== page || page.shown) return;
      page.release();
      this.detail = null;
      cx.notify();
    });
  }

  /**
   * @param {Extract<Work, { kind: "comment" }>} request
   * @param {Context} cx
   */
  changeComment({ change, comment, extra }, cx) {
    const page = this.detail;
    if (!page) return;
    if (change === "start-edit") {
      return cx.timer.after(0, (cx) => {
        try {
          this.hints.clear();
          page.startEdit(comment, cx);
        } catch (error) {
          this.failed = `${page.issue.identifier}: ${message(error)}`;
          cx.notify();
        }
      });
    }
    this.trackedWork(() => api.changeComment(change, comment, extra), page.issue, cx, (cx) => page.load(cx));
  }

  // Work of the page that is not an update (a comment): with the spinner, like a change. `then` runs once it is done
  /**
   * @param {() => Promise<unknown>} task
   * @param {Issue} issue
   * @param {Context} cx
   * @param {(cx: Context) => void} then
   */
  trackedWork(task, issue, cx, then) {
    this.spin();
    this.working++;
    this.failed = null;
    cx.spawn(async (cx) => {
      try {
        await task();
        then(cx);
      } catch (error) {
        this.failed = `${issue.identifier}: ${message(error)}`;
      } finally {
        this.working--;
        this.unspin(cx);
        cx.notify();
      }
    });
  }

  /**
   * @param {Group} group
   * @param {Context} cx
   */
  drop(group, cx) {
    const pressed = this.drag.drop(), loaded = this.store.index();
    cx.notify();
    if (pressed === null) return;
    const dragged = this.selection.has(pressed) ? this.selection.list() : [pressed];
    const ids = dragged.filter((id) => loaded.get(id)?.state.name !== group.state.name);
    if (ids.length) this.perform({ kind: RequestKind.STATUS, ids, name: group.state.name }, cx);
  }

  // A round button with an icon, a tooltip and a click: only the icon goes brighter under the pointer, not the circle
  // around it. A hover style does not recolor an icon, which takes its color when it is described: the panel notes
  // which button is under the pointer (`hot`). `ring` false leaves the circle without a border
  /**
   * @param {Theme} t
   * @param {{ id: string, name: string, label: string, action: (cx: Context) => void, caps?: string[],
   *   glyph?: number, size?: number, ring?: boolean, side?: Tip["side"] }} button
   */
  iconButton(t, { id, name, label, action, caps = [], glyph = ICON_BUTTON_GLYPH_PX,
    size = ICON_BUTTON_SIZE_PX, ring = true, side }) {
    const circle = roundButton(id, size)
      .when(ring, (element) => element.border_1()
        .border_color(t.border));
    return this.control(this.hints.on(circle, label, { caps, side, key: id, hover: (on, cx) => this.heat(id, on, cx) }),
      action)
      .child(svg(icon(name))
        .size(glyph)
        .text_color(lit(t, this.hot === id || channel.litAnchor() === id)));
  }

  /** @param {Theme} t */
  reloadButton(t) {
    return this.iconButton(t, { id: "reload", label: "Reload", caps: ["R"], name: "refresh",
      action: (cx) => { this.reload(cx); cx.notify(); } });
  }

  /** @param {Theme} t */
  header(t) {
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
      .hover((style) => style.bg(t.hover))
      .on_click(() => { openApp(); });
    return h_flex()
      .h(HEADER_HEIGHT_PX)
      .flex_none()
      .pl(8)
      .pr(14)
      .gap(8)
      .items_center()
      .border_b(1)
      .border_color(t.border)
      .child(this.hints.on(home, `Open ${NAME}`)
        .child(image(logo(isDark(t.background)))
          .size(14)
          .flex_none())
        .child(NAME))
      .child(div()
        .flex_1())
      .when(this.needsKey, (element) => element
        .child(this.reloadButton(t)));
  }

  // A click on the pill cannot reach a row behind it: it has its own strip under the list. The strip is always there,
  // flat while nothing is ticked: its height is what Herdr animates, and the pill, hung from its top, rises from below
  /** @param {Theme} t */
  island(t) {
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
      .bg(t.raised)
      .border_1()
      .border_color(t.border)
      .text_color(t.foreground)
      .hover((style) => style.bg(t.hover))
      .on_click(() => this.openers.commands());
    const untick = this.iconButton(t, { id: "untick", name: "close", label: "Clear selected", caps: ["Esc"],
      glyph: CLEAR_BUTTON_GLYPH_PX, size: CLEAR_BUTTON_SIZE_PX, ring: false, side: "above",
      action: (cx) => { this.selection.clear(); this.hints.clear(); cx.notify(); } });
    return strip
      .child(h_flex()
        .h(42)
        .mt(8)
        .pl(16)
        .pr(7)
        .gap(10)
        .items_center()
        .rounded(21)
        .bg(t.popover)
        .border_1()
        .border_color(t.border)
        .shadow_md()
        .text_size(12.5)
        .child(div()
          .flex_none()
          .text_color(t.foreground)
          .child(`${targets.length} selected`))
        .when(total > 0, (element) => element
          .child(div()
            .text_color(t.dim)
            .child("·"))
          .child(h_flex()
            .flex_none()
            .gap(3)
            .items_center()
            .text_color(t.muted)
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
   * @param {Theme} t
   * @param {IssuePage} page
   */
  page(t, page) {
    const width = this.frame ? this.frame.width / zoom() : DEFAULT_PANEL_WIDTH_PX;
    const issue = this.store.index()
      .get(page.issue.id) ?? page.issue;
    return page.render(t, issue, width, (cx) => this.closeDetail(cx));
  }

  // The total of the view, in the mode the groups' totals are in: the number of issues, or their estimates. Like
  // theirs, it brightens under the pointer, and a click switches the mode of all of them
  /**
   * @param {Theme} t
   * @param {Issue[]} issues
   */
  totalButton(t, issues) {
    const counting = this.totals === "count", cut = this.store.more[this.view];
    return this.control(warming(this, h_flex()
      .h(22)
      .px(5)
      .flex_none()
      .gap(3)
      .items_center()
      .rounded(5)
      .cursor_pointer()
      .text_size(12), "total-view", t.muted, t.foreground), (cx) => this.switchTotals(cx))
      .when(!counting, (element) => element.child(svg(icon("estimate"))
        .size(14)))
      .child(counting ? `${issues.length}${cut ? "+" : ""} ${issues.length === 1 && !cut ? "issue" : "issues"}`
      : String(points(issues, this.store.teams)));
  }

  /**
   * @param {Theme} t
   * @param {Context} cx
   */
  render(t, cx) {
    this.hints.begin();
    // A popup open over the panel takes the pointer: no tooltip stays up or comes up meanwhile, since the control it
    // hangs from is never told the pointer left
    if (channel.popups().length) this.hints.clear();
    this.serve(cx);
    this.retake(cx);
    // A page that has slid in covers the list, which is then not drawn: it would still answer the pointer
    const covered = Boolean(this.detail?.settled);
    const { store } = this, issues = store.issues[this.view], sections = this.sections();
    this.visibleIds = sections.filter((group) => !this.folded.has(group.state.name))
      .flatMap((group) => group.issues.map((issue) => issue.id));
    const look = {
      t,
      identifierWidth: widest(issues.map((issue) => issue.identifier)),
      estimateWidth: widest(issues.map((issue) => estimateLabel(store.teams.get(issue.team.id), issue.estimate) ?? "")),
      lit: channel.lit(),
    };
    const empty = this.loading ? "Loading issues…" : this.view === ViewKey.CYCLE ? "No issues in the current cycle"
      : "No assigned issues";
    /**
     * @param {string} text
     * @param {Color} color
     */
    const note = (text, color) => div()
      .flex_none()
      .px(16)
      .text_size(11)
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
        .bg(this.view === view ? t.selected : t.background)
        .text_color(this.view === view ? t.foreground : t.muted)
        .when(this.view !== view, (element) => element.hover((style) => style.bg(t.hover)))
        .on_click((_e, cx) => this.show(view, cx))
        .child(svg(icon(name))
          .size(14)
          .flex_none())
        .child(label),
      label, { caps: [String(nth + 1)] });
    /**
     * @param {MouseButtonEvent} _e
     * @param {Context} cx
     */
    const endDrag = (_e, cx) => { if (this.drag.cancel()) cx.notify(); };
    return v_flex()
      .id("issues-panel")
      .relative()
      .track_focus(this.handle)
      .focus((style) => style.border_color(t.accent))
      .on_key_down((event, cx) => { this.hints.keys(event.modifiers, event.key, cx); this.key(event, cx); })
      .on_key_up((event, cx) => this.hints.keys(event.modifiers, null, cx))
      .on_modifiers_changed((event, cx) => this.hints.keys(event.modifiers, null, cx))
      .size_full()
      .min_h(0)
      .rounded(10)
      .overflow_hidden()
      .bg(t.background)
      .border_1()
      .border_color(t.border)
      .text_color(t.foreground)
      .text_size(13)
      // A popup opened from the panel has the keyboard for a moment: the panel keeps its focused look meanwhile, and
      // while it takes the keyboard back
      .when(channel.popups().length > 0 || this.retaking || this.pageHasKeyboard(),
        (element) => element.border_color(t.accent))
      .on_mouse_up("left", endDrag)
      .on_mouse_down_out(endDrag)
      .on_mouse_down_out((_e, cx) => {
        if (!this.detail?.commentHasKeyboard) return;
        this.detail.commentHasKeyboard = false;
        cx.notify();
      })
      .on_mouse_down("left", () => { this.handle.focus(); this.drag.settle(); })
      .on_mouse_down("right", () => this.handle.focus())
      .on_mouse_move((event, cx) => {
        this.frame = event.bounds;
        this.pointer = event.position;
        if (this.drag.follow(event.position, event.local_position)) cx.notify();
      })
      .when(this.needsKey, (element) => element.child(this.header(t)))
      .when(this.needsKey, (element) => element.child(this.setup.render(t)))
      .when(!this.needsKey && !covered, (element) => element
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
          .child(this.iconButton(t, { id: "new-issue", label: "Create new issue", caps: ["C"], name: "create",
            glyph: NEW_ISSUE_GLYPH_PX, action: () => this.openers.compose() }))
          .child(this.iconButton(t, { id: "display-options", label: "Show display options", caps: ["⇧", "V"],
            name: "display", action: () => this.openers.displayOptions() }))
          .child(this.reloadButton(t)))
        .child(h_flex()
          .flex_none()
          .px(11)
          .items_center()
          .child(this.totalButton(t, issues)))
        .children(this.error ? [note(this.error, t.ansi1)] : [])
        .children(this.failed ? [note(this.failed, t.ansi1)
          .id("failed")
          .cursor_pointer()
          .on_click((_e, cx) => { this.failed = null; cx.notify(); })] : [])
        .child(v_flex()
          .id("issues")
          .flex_1()
          .min_h(0)
          .overflow_y_scrollbar()
          .px(6)
          .pb(6)
          .children(sections.map((group) => section(this, group, look)))
          .when(!issues.length && !this.error, (element) =>
            element.child(div()
              .p(8)
              .text_size(12)
              .text_color(t.dim)
              .child(empty)))
          .when(Boolean(store.more[this.view]), (element) => element.child(div()
            .p(8)
            .text_size(11)
            .text_color(t.dim)
            .child(`Showing the first ${api.ISSUES_PER_VIEW} issues`))))
        .child(this.island(t)))
      .children(this.detail ? [this.page(t, this.detail)] : [])
      .when(this.spinning, (element) => element
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
            .bg(t.popover)
            .border_1()
            .border_color(t.border)
            .shadow_md()
            .child(svg(shipped("spinner"))
              .size(18)
              .text_color(t.muted)
              .spin(SPINNER_TURN_MS)))))
      .children(this.hints.showing() && this.frame ? [this.hints.draw(t, this.frame)] : [])
      .when(this.drag.carrying, (element) => element.child(carried(this, t)));
  }
}

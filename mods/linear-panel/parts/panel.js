// The panel: my issues by view, grouped by status, and everything that can be done to them from here.
// It holds the issues and does the work. The popups (see popups.js) only ask for it, through channel.js.
import { div, image, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import * as api from "../api.js";
import * as channel from "../channel.js";
import * as dock from "../dock.js";
import { knownAgents } from "herdr";
import { copy, start } from "../actions.js";
import { COMPLETED, MIN_SPIN, ORDERINGS, RELOAD_EVERY, VIEWS, copiesFor, icon, logo, shipped } from "../config.js";
import { openChoices, openCommands, openDisplayOptions, openIssueMenu, openTeamPicker } from "../popups.js";
import { NAME, composeIssue, isMac, openApp, openPage } from "../tracker.js";
import { chordCaps, zoom } from "../ui.js";
import { isDark } from "../lib/color.js";
import { Drag } from "../lib/drag.js";
import { panelKey } from "../lib/keys.js";
import { filters, groups, points } from "../lib/listing.js";
import { merges } from "../lib/merges.js";
import { Selection } from "../lib/selection.js";
import { pickAgent } from "../lib/start.js";
import { changeable, estimateLabel, moves } from "../lib/teams.js";
import { Hints } from "./hints.js";
import { carried, section } from "./issue-list.js";
import { Setup } from "./setup.js";

const HEADER = 42;

// The stored value when it is one of the options, which are [value, label].
/**
 * @template {string} T
 * @param {string} name
 * @param {[T, string][]} options
 */
const stored = (name, options) => options.find(([value]) => value === localStorage.getItem(name))?.[0];
/** @param {any} error */
const message = (error) => String(error?.message ?? error);

// Whether a lookup found something: as a filter, it tells the checker that what is left was found.
/**
 * @template T
 * @param {T | undefined} looked
 * @returns {looked is T}
 */
const found = (looked) => looked !== undefined;

// The stored list of names, or none when nothing readable is stored.
/** @param {string} name */
function storedNames(name) {
  try {
    const names = JSON.parse(localStorage.getItem(name) ?? "[]");
    return Array.isArray(names) ? /** @type {string[]} */ (names) : [];
  } catch {
    return [];
  }
}

export class Panel {
  // `settings` are the person's, from the panel's block in their layout.
  /**
   * @param {PanelProps} settings
   * @param {Context} cx
   */
  constructor(settings, cx) {
    this.settings = settings;
    api.use(settings.api);
    // The agents people can start, as Herdr knows them. Asked once: Herdr asks a shell for them.
    /** @type {Agent[]} */
    this.agents = [];
    cx.spawn(async (cx) => {
      // Without them, the issue menu offers no Start.
      this.agents = await knownAgents().catch(() => []);
      cx.notify();
    });
    this.view = stored("view", VIEWS) ?? VIEWS[0][0];
    this.display = {
      by: stored("order", ORDERINGS) ?? "priority",
      reversed: localStorage.getItem("reversed") === "1",
      recency: localStorage.getItem("recency") !== "0",
      completed: stored("completed", COMPLETED) ?? "week",
    };
    // The figure beside each status: its estimate "points", or the "count" of its issues.
    this.totals = localStorage.getItem("totals") === "count" ? "count" : "points";
    // The statuses whose issues are folded away, by name.
    this.folded = new Set(storedNames("folded"));
    // The id of the list's small mark under the pointer, or null.
    /** @type {string | null} */
    this.hot = null;
    // The id of the issue whose row is under the pointer, or null.
    /** @type {string | null} */
    this.hovered = null;
    // The ids of the issues in the order last drawn.
    /** @type {string[]} */
    this.listed = [];
    // What the API answered: the issues of each view and whether a view has more than it loaded, the teams of those
    // issues by id, then `me` (my user id) and `myTeams`.
    this.issues = Object.fromEntries(VIEWS.map(/** @returns {[string, Issue[]]} */ ([view]) => [view, []]));
    /** @type {Record<string, boolean>} */
    this.more = {};
    /** @type {Map<string, Team>} */
    this.teams = new Map();
    this.me = "";
    // An issue's stays in each status, by issue id, once its status mark was pointed at: null until the API answers.
    /** @type {Map<string, StatusSpan[] | null>} */
    this.history = new Map();
    // The points planned in a cycle to come, by cycle id, once its row's cycle was pointed at: null until the API
    // answers. `at` is when they were asked.
    /** @type {Map<string, { points: number | null, at: number }>} */
    this.planned = new Map();
    // What an issue's merge requests changed and who reviewed them, by issue id, once its row's merge requests were
    // pointed at: null until the API answers. `at` is when they were asked.
    /** @type {Map<string, { details: MergeDetails[] | null, at: number }>} */
    this.merging = new Map();
    this.selection = new Selection();
    this.drag = new Drag();
    this.hints = new Hints();
    this.setup = new Setup();
    this.handle = cx.focus_handle();
    // How many changes asked of the tracker have not ended yet.
    this.working = 0;
    // When the spinner last started; 0 before the first.
    this.spunAt = 0;
    // When the last load began; 0 before the first.
    this.loadedAt = 0;
    channel.reset();
    this.keyboardAt = channel.givenBack();
    // A request left over from before a restart or reload is not replayed.
    this.served = channel.pending()?.at;
    cx.timer.every(RELOAD_EVERY, (cx) => { if (dock.isShown()) this.reload(cx, true); });
  }

  // Every loaded issue by id: an issue of the current cycle is in both views.
  index() {
    return new Map(Object.values(this.issues).flat().map((issue) => [issue.id, issue]));
  }

  ticked() {
    const loaded = this.index();
    return this.selection.list().map((id) => loaded.get(id)).filter(found);
  }

  // The teams of these issues, those that are loaded.
  /** @param {Issue[]} issues */
  teamsOf(issues) {
    return [...new Set(issues.map((issue) => issue.team.id))].map((id) => this.teams.get(id)).filter(found);
  }

  sections() {
    return groups(this.issues[this.view], this.display);
  }

  // These issues from the top of the list down, which is the order they are copied in.
  /** @param {Issue[]} issues */
  inListOrder(issues) {
    const order = this.sections().flatMap((group) => group.issues.map((issue) => issue.id));
    return [...issues].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  }

  // Work shows as a spinner in the middle of the panel, never as a line above the list, which would push the issues
  // down and back.
  spin() {
    if (this.spinning) return;
    this.spinning = true;
    this.spunAt = Date.now();
  }

  // Stops the spinner once it has shown long enough, unless a load or a change is still under way: a quiet reload
  // that ends must not hide the spinner of a change that has not.
  /** @param {Context} cx */
  unspin(cx) {
    const idle = () => !this.loading && !this.working;
    if (!idle()) return;
    const rest = this.spunAt + MIN_SPIN - Date.now();
    if (rest > 0) cx.timer.after(rest, (cx) => { if (idle()) { this.spinning = false; cx.notify(); } });
    else this.spinning = false;
  }

  // `quiet` is for reloads nobody asked for (the timer): they show no spinner.
  // This only sets the loading state. A click or a key that asks for a reload must cx.notify() to show it: render()
  // calls this too, where a notify is not allowed (it left the first load hanging).
  /** @param {Context} cx */
  reload(cx, quiet = false) {
    if (!quiet) this.spin();
    // One load at a time: a reload asked for meanwhile runs when this one ends.
    if (this.loading) { this.again = true; return; }
    this.loading = true;
    this.loadedAt = Date.now();
    cx.spawn(async (cx) => {
      try {
        await this.load();
        this.needsKey = false;
        this.error = null;
      } catch (error) {
        this.needsKey = error instanceof api.NoKey;
        this.error = this.needsKey ? null : message(error);
      } finally {
        this.loading = false;
        if (this.again) { this.again = false; this.reload(cx, true); }
        else if (this.spinning) this.unspin(cx);
        cx.notify();
      }
    });
  }

  async load() {
    const viewer = await api.issues(filters(this.display.completed, Date.now()));
    this.me = viewer.id;
    this.myTeams = viewer.teams.nodes;
    for (const [view] of VIEWS) {
      this.issues[view] = viewer[view].nodes;
      this.more[view] = viewer[view].pageInfo.hasNextPage;
    }
    const loaded = this.index();
    // What is known of an issue's stays is out of date once its status has changed.
    for (const [id,
      spans] of this.history) if (spans?.at(-1)?.state?.id !== loaded.get(id)?.state.id) this.history.delete(id);
    // A tick stays only on an issue the view still shows: nothing is done to an issue that cannot be seen.
    this.selection.keep(new Set(this.issues[this.view].map((issue) => issue.id)));
    // shortcut: a team's states, estimate scale and cycles are read once, reload the mod after changing them in the
    // tracker. A cycle created since is missing from the cycle choices until then.
    const missing = [...new Set([...loaded.values()].map((issue) => issue.team.id))]
      .filter((id) => !this.teams.has(id));
    if (missing.length) for (const team of await api.teams(missing)) this.teams.set(team.id, team);
  }

  // Takes the keyboard back once a popup opened from the panel has gone (channel.js), unless another popup is still
  // open. Herdr hands the keyboard to the terminal a few milliseconds after a popup closes, whoever had it before:
  // the panel takes it again right after, several times because the moment is not known. It cannot take it here,
  // while drawing. Meanwhile it keeps its focused look (`retaking`), so its outline does not blink.
  /** @param {Context} cx */
  retake(cx) {
    const at = channel.givenBack();
    if (!at || at === this.keyboardAt) return;
    this.keyboardAt = at;
    this.retaking = true;
    const take = () => { if (!channel.popups().length) this.handle.focus(); };
    for (const wait of [1, 8, 30]) cx.timer.after(wait, take);
    cx.timer.after(150, (cx) => { take(); this.retaking = false; cx.notify(); });
  }

  // Called on every render: a request made since the last one is served once.
  /** @param {Context} cx */
  serve(cx) {
    const request = channel.pending();
    if (!request || request.at === this.served) return;
    this.served = request.at;
    if (request.kind === "display") this.redisplay(request.change, cx);
    else if (request.kind === "compose") composeIssue(request.team);
    else this.perform(request, cx);
  }

  /**
   * @param {Work & { ids: string[] }} request
   * @param {Context} cx
   */
  perform(request, cx) {
    const loaded = this.index(), targets = request.ids.map((id) => loaded.get(id)).filter(found);
    if (!targets.length) return;
    const name = targets.length === 1 ? targets[0].identifier : `${targets.length} issues`;
    // Copying an issue or opening its page changes nothing in the tracker: no spinner, no reload.
    const changes = request.kind !== "copy" && request.kind !== "open";
    if (changes) {
      this.spin();
      this.working++;
    }
    this.failed = null;
    cx.spawn(async (cx) => {
      try {
        await this.carryOut(request, targets, cx);
      } catch (error) {
        this.failed = `${name}: ${message(error)}`;
      } finally {
        if (changes) {
          this.working--;
          this.reload(cx);
        }
        cx.notify();
      }
    });
  }

  /**
   * @param {Work} request
   * @param {Issue[]} targets
   * @param {Context} cx
   */
  async carryOut(request, targets, cx) {
    const [issue] = targets;
    if (request.kind === "start") {
      // The settings give the base of the agent's first message as a text, or as its lines.
      const base = [this.settings.start_prompt ?? []].flat().join("\n");
      return start(issue, request.text, this.teams.get(issue.team.id)?.states ?? [], { agent: this.agent(), base });
    }
    if (request.kind === "copy") return copy(this.inListOrder(targets), request.what, cx);
    if (request.kind === "open") return openPage(issue.url);
    if (request.kind === "status") {
      for (const [stateId, ids] of moves(targets, this.teams, request.name)) await api.update(ids, { stateId });
      return;
    }
    await api.update(targets.map((target) => target.id), request.input);
  }

  // A display option changed in its popup. Which finished issues show is the API's to filter, so that one reloads.
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

  // A new issue is written in the tracker: this only picks the team, among those I belong to, and skips the question
  // when I belong to only one.
  compose() {
    const teams = [...(this.myTeams ?? [])].sort((a, b) => (a.key < b.key ? -1 : 1));
    if (teams.length === 1) composeIssue(teams[0]);
    else if (teams.length) openTeamPicker(teams);
  }

  // The display options open under the header, by the panel's right edge: a key opens them too, wherever the pointer
  // is.
  displayOptions() {
    const frame = this.frame, scale = zoom();
    const corner = frame && { x: frame.x + frame.width - 8 * scale, y: frame.y + (HEADER + 4) * scale };
    openDisplayOptions(this.display, corner && { point: corner, frame });
  }

  /** @param {Page} page */
  commands(page = "actions") {
    const targets = this.ticked(), teams = this.teamsOf(targets);
    if (!targets.length || !teams.length) return;
    // Straight to a property these issues cannot be given together (an estimate, for a team without one): nothing.
    if (page !== "actions" && !changeable(teams).includes(page)) return;
    openCommands(targets, teams, page, this.me);
  }

  // One property's choices for the issue under the pointer, where the pointer is. Nothing when the property has none
  // (a team that does not estimate).
  /**
   * @param {Issue} issue
   * @param {Property} page
   */
  choose(issue, page) {
    this.offer(issue, page, this.pointer, false);
  }

  // One property's choices from a control of the issue's own row, where it was pressed (`at`, for a right-click).
  /**
   * @param {Issue} issue
   * @param {Property} page
   * @param {Point | undefined} [at]
   */
  pick(issue, page, at = this.pressedAt) {
    this.offer(issue, page, at, true);
  }

  // `bare` leaves out the chip naming the issue.
  /**
   * @param {Issue} issue
   * @param {Property} page
   * @param {Point | undefined} point
   * @param {boolean} bare
   */
  offer(issue, page, point, bare) {
    const teams = this.teamsOf([issue]);
    if (changeable(teams).includes(page)) openChoices([issue], teams, page, this.me, { point, frame: this.frame },
      { bare });
  }

  // The menu of the issue right-clicked. On one of several ticked issues, it is about all of them.
  /**
   * @param {Issue} issue
   * @param {Point} at
   */
  openMenu(issue, at) {
    this.handle.focus();
    const together = this.selection.size > 1 && this.selection.has(issue.id);
    const issues = together ? this.inListOrder(this.ticked()) : [issue];
    openIssueMenu(issues, this.teamsOf(issues), this.me, { point: at, frame: this.frame }, this.agent()?.name ?? null);
  }

  // The agent Start runs (lib/start.js), or null while Herdr has not told its agents, or has none.
  agent() {
    return pickAgent(this.agents, this.settings.agent);
  }

  // Keys while the panel has the keyboard, which a press in it gives. lib/keys.js says what each one asks for.
  /**
   * @param {KeyEvent} e
   * @param {Context} cx
   */
  key(e, cx) {
    if (this.needsKey) return;
    // The issue under the pointer, if the list still shows it: a row that went away is not told the pointer left.
    const ticked = this.selection.size > 0, hovered = this.hovered;
    const under = hovered !== null && this.listed.includes(hovered) ? this.index().get(hovered) : null;
    // A copy shortcut acts on the ticked issues, else on the issue under the pointer, as the property keys do.
    const copied = ticked ? this.selection.list() : under ? [under.id] : [];
    const asked = panelKey(e,
      { mac: isMac(), views: VIEWS.length, ticked, pointed: Boolean(under), aimed: copied.length > 0 });
    if (!asked) return;
    // An issue's own keys (choose, tick, unassign with nothing ticked) are asked for only when one is `pointed`.
    const pointed = /** @type {Issue} */ (under);
    switch (asked.do) {
      case "commands": this.commands(asked.page); break;
      // Not every entry is offered for several issues.
      case "copy":
        if (copiesFor(copied.length)
          .some((entry) => entry.what === asked.what)) this.perform({ kind: "copy", ids: copied, what: asked.what },
          cx);
        break;
      case "compose": this.compose(); break;
      case "reload": this.reload(cx); break;
      case "display": this.displayOptions(); break;
      case "view": this.show(VIEWS[asked.nth][0], cx); break;
      case "choose": this.choose(pointed, asked.page); break;
      case "unassign":
        this.perform({ kind: "update", ids: ticked ? this.selection.list() : [pointed.id],
          input: { assigneeId: null } }, cx);
        break;
      case "untick": this.selection.clear(); break;
      case "tick": this.tick(pointed, asked.extend, cx); break;
    }
    cx.stop_propagation();
    // Whatever the key started shows now (the spinner of a change, the cleared ticks).
    cx.notify();
  }

  // The pointer came on an issue's row, or left it. The row's box shows meanwhile.
  /**
   * @param {Issue} issue
   * @param {boolean} on
   * @param {Context} cx
   */
  hover(issue, on, cx) {
    const hovered = on ? issue.id : this.hovered === issue.id ? null : this.hovered;
    if (hovered === this.hovered) return;
    /** @type {string | null} */
    this.hovered = hovered;
    cx.notify();
  }

  /**
   * @param {Issue} issue
   * @param {boolean} extend
   * @param {Context} cx
   */
  tick(issue, extend, cx) {
    this.selection.click(issue.id, extend, this.listed);
    cx.notify();
  }

  // The pointer came on one of the list's small marks, or left it (parts/issue-list.js). That mark brightens.
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

  // Asks the tracker for an issue's stays in each status, once: the tooltip of its status mark tells them.
  /**
   * @param {Issue} issue
   * @param {Context} cx
   */
  recall(issue, cx) {
    if (this.history.has(issue.id)) return;
    this.history.set(issue.id, null);
    cx.spawn(async (cx) => {
      try {
        this.history.set(issue.id, await api.stateHistory(issue.id));
      } catch {
        // The tooltip goes without them, and they are asked for again the next time.
        this.history.delete(issue.id);
      }
      cx.notify();
    });
  }

  // Asks the tracker for the points planned in a cycle to come: the tooltip of a row's cycle tells them. Asked again
  // after a load, since issues come and go; meanwhile the tooltip keeps the last answer.
  /**
   * @param {Cycle} cycle
   * @param {Context} cx
   */
  plan(cycle, cx) {
    const known = this.planned.get(cycle.id);
    if (known && known.at >= this.loadedAt) return;
    const at = Date.now();
    this.planned.set(cycle.id, { points: known?.points ?? null, at });
    cx.spawn(async (cx) => {
      try {
        this.planned.set(cycle.id, { points: points(await api.planned(cycle.id), this.teams), at });
      } catch {
        // The tooltip goes without them, and they are asked for again the next time.
        this.planned.delete(cycle.id);
      }
      cx.notify();
    });
  }

  // Asks the tracker for what an issue's merge requests changed and who reviewed them: the tooltip of its row's merge
  // requests tells it. Asked again after a load, as the points of a cycle to come are.
  /**
   * @param {Issue} issue
   * @param {Context} cx
   */
  inspect(issue, cx) {
    const known = this.merging.get(issue.id);
    if (known && known.at >= this.loadedAt) return;
    const at = Date.now(), list = merges(issue), urls = new Set(list.map((merge) => merge.url));
    this.merging.set(issue.id, { details: known?.details ?? null, at });
    cx.spawn(async (cx) => {
      try {
        const found = await api.mergeDetails(list.map((merge) => merge.number),
          [...new Set(list.map((merge) => merge.repoName))]);
        // Merge requests of other repositories can share a number: only the issue's own count.
        this.merging.set(issue.id, { details: found.filter((details) => urls.has(details.url)), at });
      } catch {
        // The tooltip goes without them, and they are asked for again the next time.
        this.merging.delete(issue.id);
      }
      cx.notify();
    });
  }

  // Folds a group away, or shows its issues again. Remembered.
  /**
   * @param {Group} group
   * @param {Context} cx
   */
  fold(group, cx) {
    const name = group.state.name;
    if (!this.folded.delete(name)) {
      this.folded.add(name);
      // Its issues are no longer seen: they are unticked.
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
  // the start of a drag, and ends one left hanging by a release outside the panel. `action(cx, e)` runs on a click.
  /**
   * @param {NativeElement} el
   * @param {(cx: Context, e: ClickEvent) => void} action
   */
  control(el, action) {
    return el
      .on_mouse_down("left",
        (e, cx) => { cx.stop_propagation(); this.handle.focus(); this.drag.cancel(); this.pressedAt = e.position; })
      .on_click((e, cx) => { cx.stop_propagation(); action(cx, e); });
  }

  /**
   * @param {Group} group
   * @param {Context} cx
   */
  aim(group, cx) {
    if (this.drag.pressed === null) return;
    const own = this.index().get(this.drag.pressed)?.state.name === group.state.name;
    if (this.drag.aim(group.state.name, own)) cx.notify();
  }

  // A release on a row. Where the press began, before the pointer carried anything, it ends a click, which opens the
  // issue. Otherwise it is a drop.
  /**
   * @param {Issue} issue
   * @param {Group} group
   * @param {Context} cx
   */
  release(issue, group, cx) {
    if (!this.drag.clicked(issue.id)) return this.drop(group, cx);
    // A click moves nothing, whatever is ticked.
    this.drag.cancel();
    openPage(issue.url);
  }

  // Moves the dragged issue to the group's status, and with it every ticked issue when it is one of them.
  /**
   * @param {Group} group
   * @param {Context} cx
   */
  drop(group, cx) {
    const pressed = this.drag.drop(), loaded = this.index();
    cx.notify();
    if (pressed === null) return;
    const dragged = this.selection.has(pressed) ? this.selection.list() : [pressed];
    const ids = dragged.filter((id) => loaded.get(id)?.state.name !== group.state.name);
    if (ids.length) this.perform({ kind: "status", ids, name: group.state.name }, cx);
  }

  /**
   * @param {Theme} t
   * @param {number} count
   */
  header(t, count) {
    /**
     * @param {string} id
     * @param {string} label
     * @param {string[]} caps
     * @param {string} name
     * @param {number} size
     * @param {OnClick} action
     */
    const round = (id, label, caps, name, size, action) => this.hints.on(
      div().id(id).size(26).flex_none().flex().items_center().justify_center().rounded(13).cursor_pointer()
        .border_1().border_color(t.border).text_color(t.muted)
        .hover((s) => s.bg(t.hover).text_color(t.foreground))
        .on_click(action),
      label, { caps }).child(svg(icon(name)).size(size));
    const home = div().id("home").h(28).px(6).gap(6).flex_none().flex().items_center().rounded(6).cursor_pointer()
      .font_semibold()
      .hover((s) => s.bg(t.hover))
      .on_click(() => { openApp(); });
    const badge = div().px(5).py(1).rounded(4).border_1().border_color(t.border).text_size(10).text_color(t.muted)
      .child(`${count}${this.more[this.view] ? "+" : ""} ${count === 1 && !this.more[this.view] ? "issue" : "issues"}`);
    return h_flex().h(HEADER).flex_none().pl(8).pr(14).gap(8).items_center().border_b(1).border_color(t.border)
      // The tracker's logo, as a picture in its own color, then its name.
      .child(this.hints.on(home, `Open ${NAME}`)
        .child(image(logo(isDark(t.background))).size(14).flex_none())
        .child(NAME))
      .when(!this.needsKey, (el) => el.child(badge))
      .child(div().flex_1())
      .when(!this.needsKey, (el) => el
        .child(round("new-issue", "Create new issue", ["C"], "create", 15, () => this.compose()))
        .child(round("display-options", "Show display options", ["⇧", "V"], "display", 14,
          () => this.displayOptions())))
      .child(round("reload", "Reload", ["R"], "refresh", 14, (_e, cx) => { this.reload(cx); cx.notify(); }));
  }

  // A click on the pill cannot reach a row behind it: it has its own strip under the list. The strip is always there,
  // flat while nothing is ticked: its height is what Herdr animates, and the pill, hung from its top, rises from below.
  /** @param {Theme} t */
  island(t) {
    const strip = h_flex().id("island").flex_none().h(this.selection.size > 0 ? 58 : 0).overflow_hidden().items_start()
      .justify_center()
      .transition("height", { duration: 180, easing: "ease-out" });
    if (!this.selection.size) return strip;
    const targets = this.ticked(), total = points(targets, this.teams);
    const actions = h_flex().id("actions").h(28).px(11).gap(6).flex_none().items_center().rounded(14).cursor_pointer()
      .bg(t.raised).border_1().border_color(t.border).text_color(t.foreground)
      .hover((s) => s.bg(t.hover))
      .on_click(() => this.commands());
    const untick = div().id("untick").size(28).flex_none().flex().items_center().justify_center().rounded(14)
      .cursor_pointer()
      .text_color(t.muted)
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .on_click((_e, cx) => { this.selection.clear(); this.hints.clear(); cx.notify(); });
    return strip
      .child(h_flex().h(42).mt(8).pl(16).pr(7).gap(10).items_center().rounded(21)
        .bg(t.popover).border_1().border_color(t.border).shadow_md().text_size(12.5)
        .child(div().flex_none().text_color(t.foreground).child(`${targets.length} selected`))
        .when(total > 0, (el) => el
          .child(div().text_color(t.dim).child("·"))
          .child(h_flex().flex_none().gap(3).items_center().text_color(t.muted).child(svg(icon("estimate")).size(13))
            .child(String(total))))
        .child(this.hints.on(actions, "Open command menu", { caps: chordCaps(["K"]), side: "above" })
          .child(svg(icon("command")).size(13)).child("Actions"))
        .child(this.hints.on(untick, "Clear selected", { caps: ["Esc"], side: "above" })
          .child(svg(icon("close")).size(13))));
  }

  /**
   * @param {Theme} t
   * @param {Context} cx
   */
  render(t, cx) {
    this.hints.begin();
    this.serve(cx);
    this.retake(cx);
    // The panel shown again after a while. Its very first load shows a spinner, a catch-up does not.
    if (dock.isShown() && Date.now() - this.loadedAt > RELOAD_EVERY) this.reload(cx, this.loadedAt !== 0);
    const issues = this.issues[this.view], sections = this.sections();
    // The issues in the order drawn, for a Shift+click to span: not those of a folded group, which are not drawn.
    this.listed = sections.filter((group) => !this.folded.has(group.state.name))
      .flatMap((group) => group.issues.map((issue) => issue.id));
    const look = {
      t,
      // One column for every identifier, as wide as the longest (about 7 px a character at this size), so the status
      // marks line up.
      identifierWidth: Math.max(0, ...issues.map((issue) => issue.identifier.length)) * 7,
      // The same for the estimates, so their triangles line up whatever the digits beside them. Triangle and figure are
      // each centered in a column of their own.
      estimateWidth: Math.max(0,
        ...issues.map((issue) => (estimateLabel(this.teams.get(issue.team.id), issue.estimate) ?? "").length)) * 7,
      lit: channel.lit(),
    };
    const cycles = [...new Set(this.issues.cycle.flatMap(({ cycle }) =>
      (cycle ? [`${cycle.name ?? `Cycle ${cycle.number}`} · ends ${cycle.endsAt.slice(0, 10)}`] : [])))];
    const empty = this.loading ? "Loading issues…" : this.view === "cycle" ? "No issues in the current cycle"
      : "No assigned issues";
    /**
     * @param {string} text
     * @param {Color} color
     */
    const note = (text, color) => div().flex_none().px(16).pt(6).text_size(11).text_color(color).child(text);
    /**
     * @param {[ViewKey, string]} entry
     * @param {number} nth
     */
    const pill = ([view, label], nth) => this.hints.on(
      h_flex().id(`view-${view}`).h(28).px(9).gap(6).flex_none().items_center().rounded(6).cursor_pointer()
        .text_size(13)
        .bg(this.view === view ? t.selected : t.background).text_color(this.view === view ? t.foreground : t.muted)
        .hover((s) => s.bg(t.hover))
        .on_click((_e, cx) => this.show(view, cx))
        .child(svg(icon(`view-${view}`)).size(14).flex_none())
        .child(label),
      label, { caps: [String(nth + 1)] });
    /**
     * @param {MouseButtonEvent} _e
     * @param {Context} cx
     */
    const endDrag = (_e, cx) => { if (this.drag.cancel()) cx.notify(); };
    return v_flex().id("issues-panel").relative().track_focus(this.handle)
      // With the keyboard, the panel is outlined like a focused pane.
      .focus((s) => s.border_color(t.accent))
      .on_key_down((e, cx) => this.key(e, cx))
      .size_full().min_h(0).rounded(10).overflow_hidden()
      .bg(t.background).border_1().border_color(t.border).text_color(t.foreground).text_size(13)
      // A popup opened from the panel has the keyboard for a moment: the panel keeps its focused look meanwhile, and
      // while it takes the keyboard back.
      .when(channel.popups().length > 0 || Boolean(this.retaking), (el) => el.border_color(t.accent))
      // Rows and headings handle the releases that drop. Whatever reaches here ends the drag with nothing moved:
      // a release off the groups, a press outside the panel.
      .on_mouse_up("left", endDrag)
      .on_mouse_down_out(endDrag)
      // Any press in the panel gives it the keyboard. The handlers that stop a press before it gets here (a row's
      // controls, a heading's figure, a right-click) focus it themselves.
      .on_mouse_down("left", () => { this.handle.focus(); this.drag.settle(); })
      .on_mouse_down("right", () => this.handle.focus())
      .on_mouse_move((e, cx) => {
        this.frame = e.bounds;
        this.pointer = e.position;
        if (this.drag.follow(e.position, e.local_position)) cx.notify();
      })
      .child(this.header(t, issues.length))
      .when(Boolean(this.needsKey), (el) => el.child(this.setup.render(t)))
      .when(!this.needsKey, (el) => el
        .child(h_flex().flex_none().px(8).pt(8).gap(4).items_center().children(VIEWS.map(pill)))
        .when(this.view === "cycle" && cycles.length === 1, (el) => el.child(note(cycles[0], t.dim)))
        .children(this.error ? [note(this.error, t.ansi1)] : [])
        .children(this.failed ? [note(this.failed, t.ansi1).id("failed").cursor_pointer()
          .on_click((_e, cx) => { this.failed = null; cx.notify(); })] : [])
        .child(v_flex().id("issues").flex_1().min_h(0).overflow_y_scrollbar().p(6)
          .children(sections.map((group) => section(this, group, look)))
          .when(!issues.length && !this.error, (el) =>
            el.child(div().p(8).text_size(12).text_color(t.dim).child(empty)))
          .when(Boolean(this.more[this.view]), (el) =>
            el.child(div().p(8).text_size(11).text_color(t.dim).child("Showing the first 100 issues"))))
        .child(this.island(t)))
      // Work someone asked for shows in the middle of the panel, over the list. It takes no mouse event: nothing
      // listens on it.
      .when(Boolean(this.spinning), (el) => el.child(div().absolute().inset_0().flex().items_center().justify_center()
        .child(div().size(40).flex().items_center().justify_center().rounded(20)
          .bg(t.popover).border_1().border_color(t.border).shadow_md()
          .child(svg(shipped("spinner")).size(18).text_color(t.muted).spin(900)))))
      .children(this.hints.showing() && this.frame ? [this.hints.draw(t, this.frame)] : [])
      // Last, so it is drawn over everything else.
      .when(this.drag.carrying, (el) => el.child(carried(this, t)));
  }
}

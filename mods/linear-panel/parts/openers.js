// Opens the popups from the panel, each where it belongs: below or beside the control pressed, or at the pointer when
// a key asked
import { HEADER_HEIGHT_PX } from "../config.js";
import { Page } from "../enums.js";
import { openChoices, openCommands, openCommentMenu, openConfirmDelete, openDisplayOptions, openIssueMenu, openLabels,
  openTeamPicker } from "../popups.js";
import { composeIssue } from "../tracker.js";
import { zoom } from "../ui.js";
import { frequent } from "../lib/labels.js";
import { CONTROL_GAP_PX } from "../lib/placement.js";
import { changeable } from "../lib/teams.js";
import { compareText } from "../lib/text.js";
import { addLabelsId } from "./issue-page.js";

const CORNER_OFFSET_X_PX = 8;
const CORNER_OFFSET_Y_PX = 4;
const PROPERTY_GAP_PX = 2;

export class Openers {
  /** @param {Panel} panel */
  constructor(panel) {
    this.panel = panel;
  }

  // My teams by key
  sortedTeams() {
    return [...this.panel.store.myTeams].sort((first, second) => compareText(first.key, second.key));
  }

  compose() {
    const teams = this.sortedTeams(), [only] = teams;
    if (only && teams.length === 1) composeIssue(only);
    else if (teams.length) openTeamPicker(teams);
  }

  displayOptions() {
    const { frame } = this.panel, scale = zoom();
    const corner = frame && { x: frame.x + frame.width - CORNER_OFFSET_X_PX * scale,
      y: frame.y + (HEADER_HEIGHT_PX + CORNER_OFFSET_Y_PX) * scale };
    openDisplayOptions(this.panel.display, corner && { point: corner, frame });
  }

  /** @param {Page} page */
  commands(page = Page.ACTIONS) {
    const { panel } = this, targets = panel.ticked(), teams = panel.store.teamsOf(targets);
    if (!targets.length || !teams.length) return;
    if (page !== Page.ACTIONS && !changeable(teams)
      .includes(page)) return;
    openCommands(targets, teams, page, panel.store.myId);
  }

  // Where a key's popup opens: at the pointer
  atPointer() {
    return { point: this.panel.pointer, frame: this.panel.frame };
  }

  /**
   * @param {"below" | "right" | "either side"} how
   * @param {Bounds} [bounds] of the control, by default the last one pressed
   * @returns {Where}
   */
  placed(how, bounds = this.panel.pressedBounds) {
    const { frame, pressedAt, pointer } = this.panel;
    if (!bounds) return { point: pressedAt ?? pointer, frame };
    if (how === "below") return { below: bounds, frame };
    return how === "right" ? { beside: bounds, frame, narrow: true } : { beside: bounds, frame, gap: CONTROL_GAP_PX };
  }

  /**
   * @param {Issue} issue
   * @param {Property} page
   */
  chooseByKey(issue, page) {
    this.offer(issue, page, this.atPointer(), { bare: false });
  }

  /**
   * @param {Issue} issue
   * @param {Property} page
   * @param {Bounds} [bounds] the control, when it is not the one last pressed
   */
  pick(issue, page, bounds = this.panel.pressedBounds) {
    this.offer(issue, page, this.placed("below", bounds), { bare: true });
  }

  /**
   * @param {Issue} issue
   * @param {Property} page
   */
  pickBeside(issue, page) {
    this.offer(issue, page, this.propertyWhere(), { bare: true, anchor: `page-${page}` });
  }

  /**
   * @param {Issue} issue
   * @param {Property} page
   */
  pickByKey(issue, page) {
    const anchor = `page-${page}`, bounds = this.panel.detail?.spot(anchor);
    if (!bounds) return this.offer(issue, page, this.atPointer(), { bare: false, anchor });
    this.offer(issue, page, this.propertyWhere(bounds), { bare: true, anchor });
  }

  /**
   * @param {Issue} issue
   * @param {Property} page
   * @param {Where} where
   * @param {{ bare: boolean, anchor?: string }} options
   */
  offer(issue, page, where, { bare, anchor }) {
    const { panel } = this, teams = panel.store.teamsOf([issue]);
    if (changeable(teams)
      .includes(page)) openChoices([issue], teams, page, panel.store.myId, where, { bare, anchor });
  }

  /** @param {Issue} issue */
  pickTeam(issue) {
    this.#teamPicker(issue, this.propertyWhere());
  }

  /** @param {Issue} issue */
  pickTeamByKey(issue) {
    const bounds = this.panel.detail?.spot("page-team");
    this.#teamPicker(issue, bounds ? this.propertyWhere(bounds) : this.atPointer());
  }

  /**
   * @param {Issue} issue
   * @param {Where} where
   */
  #teamPicker(issue, where) {
    const teams = this.sortedTeams();
    if (teams.length) openTeamPicker(teams, issue, where, "page-team");
  }

  // Where a picker of a property opens, from the page: with one column of properties, on the right of the longest line;
  // with several, under the line pressed, since the next column is on its right
  /** @param {Bounds} [bounds] */
  propertyWhere(bounds = this.panel.pressedBounds) {
    const columns = this.panel.detail?.columns ?? 1;
    if (bounds && columns === 1) return this.placed("right", this.widenedToLongestLine(bounds));
    return { ...this.placed("below", bounds), gap: PROPERTY_GAP_PX };
  }

  // A property line's bounds as wide as the longest line of the page's properties: a picker opened beside it then
  // starts past all of them, at one place whichever line was pressed
  /** @param {Bounds} bounds */
  widenedToLongestLine(bounds) {
    return { ...bounds, width: Math.max(bounds.width, (this.panel.detail?.widestLinePx ?? 0) * zoom()) };
  }

  /**
   * @param {Issue} issue
   * @param {Point} at
   * @param {Bounds} [row] the issue's row
   */
  openMenu(issue, at, row) {
    const { panel } = this, { selection } = panel;
    panel.handle.focus();
    const together = selection.size > 1 && selection.has(issue.id);
    const issues = together ? panel.inListOrder(panel.ticked()) : [issue];
    openIssueMenu(issues, panel.store.teamsOf(issues), panel.store.myId, { point: at, frame: panel.frame },
      panel.agent()?.name ?? null, row);
  }

  /** @param {PageComment} comment */
  commentMenu(comment) {
    const { panel } = this, page = panel.detail;
    if (page) openCommentMenu(page.issue, comment, comment.user?.id === panel.store.myId, this.placed("below"));
  }

  /**
   * @param {import("./issue-page.js").IssuePage} page
   * @param {string} id the comment
   */
  confirmDelete(page, id) {
    const comment = page.comments.find((found) => found.id === id);
    if (comment) openConfirmDelete(page.issue, comment);
  }

  // The page of a label of the issue: for a label of a group, the group's labels, to change it or take it off; for any
  // other, the picker
  /**
   * @param {Issue} issue
   * @param {IssueLabel} label
   * @param {Context} context
   * @param {string} [anchor] the label's control, kept lit while its popup is open
   */
  chooseLabel(issue, label, context, anchor) {
    const { panel } = this, offered = panel.store.labels.get(issue.team.id);
    if (!label.parent || !offered || !panel.pressedBounds) return this.chooseLabels(issue, context, anchor);
    openLabels(issue, offered, frequent([...panel.store.index()
      .values()], offered), this.placed("either side"),
    { group: label.parent.id, anchor });
  }

  /**
   * @param {Issue} issue
   * @param {Context} context
   * @param {string} [anchor] the page's control pressed, kept lit while the picker is open
   */
  chooseLabels(issue, context, anchor) {
    this.#labels(issue, this.placed("either side"), context, anchor);
  }

  /**
   * @param {Issue} issue
   * @param {Context} context
   */
  chooseLabelsByKey(issue, context) {
    const anchor = addLabelsId(issue), bounds = this.panel.detail?.spot(anchor);
    this.#labels(issue, bounds ? this.placed("either side", bounds) : this.atPointer(), context, anchor);
  }

  /**
   * @param {Issue} issue
   * @param {Where} where
   * @param {Context} context
   * @param {string} [anchor]
   */
  #labels(issue, where, context, anchor) {
    const { panel } = this, offered = panel.store.labels.get(issue.team.id);
    if (!offered) return panel.loadLabels(issue.team.id, context);
    openLabels(issue, offered, frequent([...panel.store.index()
      .values()], offered), where, { anchor });
  }
}

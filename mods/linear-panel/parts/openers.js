// Opens the popups from the panel, each where it belongs: below or beside the control pressed, or at the pointer when
// a key asked
import { HEADER_HEIGHT_PX } from "../config.js";
import { Page } from "../enums.js";
import { openChoices, openCommands, openCommentMenu, openDisplayOptions, openIssueMenu, openLabels,
  openTeamPicker } from "../popups.js";
import { composeIssue } from "../tracker.js";
import { zoom } from "../ui.js";
import { frequent } from "../lib/labels.js";
import { changeable } from "../lib/teams.js";
import { compareText } from "../lib/text.js";

const CORNER_OFFSET_X_PX = 8;
const CORNER_OFFSET_Y_PX = 4;

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
    const teams = this.sortedTeams();
    if (teams.length === 1) composeIssue(teams[0]);
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
    openCommands(targets, teams, page, panel.store.me);
  }

  // Where a key's popup opens: at the pointer
  atPointer() {
    return { point: this.panel.pointer, frame: this.panel.frame };
  }

  // Where a popup opens, from a control: right below it, or beside it (on its right, as narrow as the room asks). With
  // no control known, at the last press
  /**
   * @param {"below" | "beside"} how
   * @param {Bounds} [bounds] of the control, by default the last one pressed
   * @returns {Where}
   */
  placed(how, bounds = this.panel.pressedBounds) {
    const { frame, pressedAt, pointer } = this.panel;
    if (!bounds) return { point: pressedAt ?? pointer, frame };
    return how === "below" ? { below: bounds, frame } : { beside: bounds, frame, narrow: true };
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
    this.offer(issue, page, this.propertyWhere(), { bare: true });
  }

  /**
   * @param {Issue} issue
   * @param {Property} page
   * @param {Where} where
   * @param {{ bare: boolean }} options
   */
  offer(issue, page, where, { bare }) {
    const { panel } = this, teams = panel.store.teamsOf([issue]);
    if (changeable(teams)
      .includes(page)) openChoices([issue], teams, page, panel.store.me, where, { bare });
  }

  /** @param {Issue} issue */
  pickTeam(issue) {
    this.#teamPicker(issue, this.propertyWhere());
  }

  /** @param {Issue} issue */
  pickTeamByKey(issue) {
    this.#teamPicker(issue, this.atPointer());
  }

  /**
   * @param {Issue} issue
   * @param {Where} where
   */
  #teamPicker(issue, where) {
    const teams = this.sortedTeams();
    if (teams.length) openTeamPicker(teams, issue, where);
  }

  // Where a picker of a property opens, from the page: with one column of properties, on the right of the longest line;
  // with several, under the line pressed, since the next column is on its right
  propertyWhere() {
    const { pressedBounds, detail } = this.panel;
    if (!pressedBounds || (detail?.columns ?? 1) > 1) return this.placed("below");
    return this.placed("beside", this.widenedToLongestLine(pressedBounds));
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
   */
  openMenu(issue, at) {
    const { panel } = this, { selection } = panel;
    panel.handle.focus();
    const together = selection.size > 1 && selection.has(issue.id);
    const issues = together ? panel.inListOrder(panel.ticked()) : [issue];
    openIssueMenu(issues, panel.store.teamsOf(issues), panel.store.me, { point: at, frame: panel.frame },
      panel.agent()?.name ?? null);
  }

  /** @param {PageComment} comment */
  commentMenu(comment) {
    const { panel } = this, page = panel.detail;
    if (page) openCommentMenu(page.issue, comment, comment.user?.id === panel.store.me, this.placed("below"));
  }

  // The page of a label of the issue: for a label of a group, the group's labels, to change it or take it off, under
  // the label; for any other, the picker beside it
  /**
   * @param {Issue} issue
   * @param {IssueLabel} label
   * @param {Context} cx
   */
  chooseLabel(issue, label, cx) {
    const { panel } = this, offered = panel.store.labels.get(issue.team.id);
    if (!label.parent || !offered || !panel.pressedBounds) return this.chooseLabels(issue, cx);
    openLabels(issue, offered, frequent([...panel.store.index()
      .values()], offered), this.placed("below"),
    { group: label.parent.id });
  }

  /**
   * @param {Issue} issue
   * @param {Context} cx
   */
  chooseLabels(issue, cx) {
    this.#labels(issue, this.placed("beside"), cx);
  }

  /**
   * @param {Issue} issue
   * @param {Context} cx
   */
  chooseLabelsByKey(issue, cx) {
    this.#labels(issue, this.atPointer(), cx);
  }

  /**
   * @param {Issue} issue
   * @param {Where} where
   * @param {Context} cx
   */
  #labels(issue, where, cx) {
    const { panel } = this, offered = panel.store.labels.get(issue.team.id);
    if (!offered) return panel.loadLabels(issue.team.id, cx);
    openLabels(issue, offered, frequent([...panel.store.index()
      .values()], offered), where);
  }
}

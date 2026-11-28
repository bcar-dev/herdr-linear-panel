// Opens the mod's popups: each one's size, where it goes, and the props its part is built from (see main.js)
import { openOverlay } from "herdr";
import { MENU_ROW_HEIGHT_PX, MOD, PICK_MAX_ROWS, copiesFor } from "./config.js";
import { light, opened, projectMembersOf } from "./channel.js";
import { Side } from "./enums.js";
import { choiceRows } from "./lib/choices.js";
import { CONTROL_GAP_PX, EDGE_MARGIN_PX, SUBMENU_GAP_PX, fitWidth, listFit, place, sideOf } from "./lib/placement.js";
import { zoom } from "./ui.js";
import { breaksHeight, heightFor as choicesHeightFor, leadFor as choicesLeadFor } from "./parts/commands.js";
import { heightFor as commentHeightFor } from "./parts/comment-menu.js";
import { placeholderFor, shownLabels } from "./lib/labels.js";
import { FRAME_PADDING_PX } from "./parts/menu.js";
import { chromeFor, copyHeightFor, listHeightFor, menuHeightFor } from "./parts/sizes.js";
import { heightFor as teamsHeightFor } from "./parts/team-picker.js";

const COMMANDS_DIALOG_HEIGHT_PX = 380, COMMANDS_DIALOG_WIDTH_PX = 460;
const COMMENT_MENU_WIDTH_PX = 240;
const CONFIRM_DELETE_HEIGHT_PX = 150, CONFIRM_DELETE_WIDTH_PX = 400;
const COPY_MENU_LABEL_REST_PX = 130, COPY_MENU_MAX_WIDTH_PX = 340, COPY_MENU_MIN_WIDTH_PX = 220;
const DISPLAY_HEIGHT_PX = 138, DISPLAY_WIDTH_PX = 280;
const ISSUE_MENU_WIDTH_PX = 228;
const LABELS_MAX_WIDTH_PX = 320, LABELS_MIN_WIDTH_PX = 120, LABELS_REST_PX = 80;
const NARROWEST_POPUP_PX = 190;
const PICK_LABEL_REST_PX = 104, PICK_LEAST_ROWS = 6, PICK_MAX_WIDTH_PX = 300, PICK_MIN_WIDTH_PX = 208;
const START_PROMPT_HEIGHT_PX = 80, START_PROMPT_WIDTH_PX = 280;
const TEAM_PICKER_ISSUE_MAX_WIDTH_PX = 320, TEAM_PICKER_ISSUE_MIN_WIDTH_PX = 220, TEAM_PICKER_ISSUE_REST_PX = 120;
const TEAM_PICKER_MAX_WIDTH_PX = 300, TEAM_PICKER_MIN_WIDTH_PX = 200, TEAM_PICKER_REST_PX = 96;

// Without `where`, at the pointer
/**
 * @param {number} width
 * @param {number} height
 * @param {Where | null | undefined} where
 * @param {PopupProps} props
 */
const popup = (width, height, where, props) => {
  const room = where?.narrow && where.beside && where.frame
    ? (where.frame.x + where.frame.width - where.beside.x - where.beside.width) / zoom() - SUBMENU_GAP_PX
      - EDGE_MARGIN_PX
    : (where?.below || where?.above) && where.frame ? where.frame.width / zoom() - 2 * EDGE_MARGIN_PX : Infinity;
  const fitted = Math.max(Math.min(width, NARROWEST_POPUP_PX), Math.min(width, Math.floor(room)));
  const side = where?.below && where.frame && sideOf(where.below, where.frame, height, zoom()) === Side.ABOVE
    ? { above: where.below, frame: where.frame, gap: where.gap } : where;
  return popupAt(fitted, height, side ? spot(side, fitted, height) : "pointer", props);
};

/**
 * @param {Where} where
 * @param {number} width
 * @param {number} height
 */
const spot = (where, width, height) => place(
  // The page's first row under its border and padding, as tall as the entry
  where.beside && !where.narrow && where.lead === undefined
    ? { ...where, lead: FRAME_PADDING_PX / 2 * zoom() + where.beside.height / 2 } : where,
  width * zoom(), height * zoom());

// Listed as open at once: the popup's own copy only starts a moment later, and until then the menu that opened it
// would take it for closed
/**
 * @param {number} width
 * @param {number} height
 * @param {Point | "pointer"} at
 * @param {PopupProps} props
 */
function popupAt(width, height, at, props) {
  const overlay = openOverlay({ mod: MOD, kind: "popup", frame: "none", width, height, at, props });
  opened(overlay);
  return overlay;
}

// A page opened beside a menu (`parent`) leaves lighting the row to the menu
/**
 * @param {Issue} issue
 * @param {string} overlay
 * @param {string} [parent]
 * @param {string} [anchor]
 */
function lightRow(issue, overlay, parent, anchor) {
  if (!parent) light(issue, overlay, anchor);
  return overlay;
}

/**
 * @param {Issue[]} issues
 * @param {Team[]} teams
 * @param {string} myId
 * @param {Where} where
 * @param {string | null} agent
 * @param {Bounds} [row] the row pressed, which Start opens under
 */
export function openIssueMenu(issues, teams, myId, where, agent, row) {
  const height = menuHeightFor({ issues, teams, agent });
  // The menu is told where it opened: a page asked for by its key takes the menu's place there
  const at = where ? spot(where, ISSUE_MENU_WIDTH_PX, height) : "pointer";
  const origin = at === "pointer" ? undefined : at;
  const props = { part: /** @type {const} */ ("issue-menu"), issues, teams, myId, agent, frame: where?.frame, origin,
    row };
  const overlay = popupAt(ISSUE_MENU_WIDTH_PX, height, at, props);
  const [only] = issues;
  return only && issues.length === 1 ? lightRow(only, overlay) : overlay;
}

/**
 * @param {Issue[]} issues
 * @param {Where} where
 * @param {string} parent
 */
export function openCopyMenu(issues, where, parent) {
  const entries = copiesFor(issues.length);
  const width = fitWidth(entries.map((entry) => entry.label), COPY_MENU_LABEL_REST_PX, COPY_MENU_MIN_WIDTH_PX,
    COPY_MENU_MAX_WIDTH_PX);
  return popup(width, copyHeightFor({ issues }), where, { part: "copy-menu", issues, parent });
}

/**
 * @param {Issue} issue
 * @param {Where} where
 * @param {string} agent
 */
export function openStartPrompt(issue, where, agent) {
  const width = where.below ? where.below.width / zoom() : START_PROMPT_WIDTH_PX;
  return lightRow(issue, popup(width, START_PROMPT_HEIGHT_PX, where, { part: "start", issue, agent }));
}

// `bare` leaves out the chip naming the issue: beside the issue menu, which names it, and from a control of the row
// itself, which stays lit
/**
 * @param {Issue[]} targets
 * @param {Team[]} teams
 * @param {Property} page
 * @param {string} myId
 * @param {Where} where
 * @param {{ parent?: string, bare?: boolean, anchor?: string }} options
 */
export function openChoices(targets, teams, page, myId, where, { parent, bare = Boolean(parent), anchor } = {}) {
  const list = choiceRows(page, { targets, teams, myId, projectMembers: projectMembersOf(targets) });
  const labels = list.map((row) => [row.label, row.note].filter(Boolean)
    .join(" "));
  const breaksPx = breaksHeight(list);
  const extra = choicesHeightFor({ breaksPx, bare, visible: 0 });
  const rows = labels.length;
  let visible = Math.min(rows, PICK_MAX_ROWS);
  if (where?.below && where.frame) {
    const { below: control, frame } = where, scale = zoom();
    const fit = listFit({ below: (frame.y + frame.height - control.y - control.height) / scale - CONTROL_GAP_PX,
      above: (control.y - frame.y) / scale - CONTROL_GAP_PX }, rows, MENU_ROW_HEIGHT_PX, extra,
    PICK_LEAST_ROWS);
    visible = fit.visible;
    if (fit.side === Side.ABOVE) where = { above: control, frame, gap: where.gap };
  } else if (where?.beside && where.frame) {
    // The panel's whole height: `place` moves the page up rather than shrink it
    const { beside, frame, narrow } = where;
    if (!narrow) where = { ...where, lead: choicesLeadFor({ bare }) * zoom() };
    const room = (narrow ? (frame.y + frame.height - beside.y) / zoom() - CONTROL_GAP_PX : frame.height / zoom())
      - extra;
    visible = Math.max(Math.min(PICK_LEAST_ROWS, rows), Math.min(rows, Math.floor(room / MENU_ROW_HEIGHT_PX)));
  } else if (where?.frame) {
    const room = where.frame.height / zoom() - extra;
    visible = Math.max(Math.min(PICK_LEAST_ROWS, rows), Math.min(rows, Math.floor(room / MENU_ROW_HEIGHT_PX)));
  }
  const height = choicesHeightFor({ breaksPx, bare, visible });
  const width = fitWidth(labels, PICK_LABEL_REST_PX, PICK_MIN_WIDTH_PX, PICK_MAX_WIDTH_PX);
  const overlay = popup(width, height, where,
    { part: "commands", targets, teams, page, myId, compact: true, bare, parent, visible });
  const [only] = targets;
  return only && targets.length === 1 ? lightRow(only, overlay, parent, anchor) : overlay;
}

/**
 * @param {Issue[]} targets
 * @param {Team[]} teams
 * @param {Page} page
 * @param {string} myId
 */
export const openCommands = (targets, teams, page, myId) =>
  dialog(COMMANDS_DIALOG_WIDTH_PX, COMMANDS_DIALOG_HEIGHT_PX, { part: "commands", targets, teams, page, myId });

/**
 * @param {Issue} issue
 * @param {PageComment} comment
 */
export const openConfirmDelete = (issue, comment) =>
  dialog(CONFIRM_DELETE_WIDTH_PX, CONFIRM_DELETE_HEIGHT_PX, { part: "confirm-delete", issue, comment });

// In the middle of the window, over everything
/**
 * @param {number} width
 * @param {number} height
 * @param {PopupProps} props
 */
function dialog(width, height, props) {
  const overlay = openOverlay({ mod: MOD, kind: "dialog", frame: "none", width, height, props });
  opened(overlay);
  return overlay;
}

/**
 * @param {Display} display
 * @param {(Where & { point: Point }) | undefined} where
 */
export const openDisplayOptions = (display, where) =>
  popup(DISPLAY_WIDTH_PX, DISPLAY_HEIGHT_PX,
    where && { ...where, point: { x: where.point.x - DISPLAY_WIDTH_PX * zoom(), y: where.point.y } },
    { part: "display", display });

/**
 * @param {Issue} issue
 * @param {AnyLabel[]} labels
 * @param {string[]} frequent
 * @param {Where} where
 * @param {{ group?: string, parent?: string, anchor?: string }} [options]
 */
export function openLabels(issue, labels, frequent, where, { group, parent, anchor } = {}) {
  const searchable = Boolean(group && !parent);
  const texts = shownLabels(labels, group)
    .map((label) => label.name);
  if (!group || searchable) texts.push(placeholderFor(issue, labels, group));
  const width = fitWidth(texts, LABELS_REST_PX, LABELS_MIN_WIDTH_PX, LABELS_MAX_WIDTH_PX);
  const chrome = chromeFor({ group, searchable });
  // The panel's whole height: `place` moves the picker up rather than shrink it
  const room = !where.frame ? PICK_MAX_ROWS * MENU_ROW_HEIGHT_PX
    : where.beside && where.narrow
      ? (where.frame.y + where.frame.height - where.beside.y) / zoom() - CONTROL_GAP_PX - chrome
      : where.frame.height / zoom() - chrome;
  const list = listHeightFor({ issue, labels, frequent, group }, room);
  const overlay = popup(width, list + chrome, where, { part: "labels", issue, labels, frequent, group, parent, list,
    searchable, frame: where.frame });
  return anchor ? lightRow(issue, overlay, parent, anchor) : overlay;
}

/**
 * @param {Issue} issue
 * @param {PageComment} comment
 * @param {boolean} isMine
 * @param {Where} where
 */
export const openCommentMenu = (issue, comment, isMine, where) =>
  popup(COMMENT_MENU_WIDTH_PX, commentHeightFor({ comment, isMine }), where,
    { part: "comment-menu", issue, comment, isMine });

/**
 * @param {MyTeam[]} teams
 * @param {Issue} [issue]
 * @param {Where} [where]
 * @param {string} [anchor]
 */
export function openTeamPicker(teams, issue, where, anchor) {
  const overlay = popup(issue
    ? fitWidth(teams.map((team) => team.name), TEAM_PICKER_ISSUE_REST_PX, TEAM_PICKER_ISSUE_MIN_WIDTH_PX,
      TEAM_PICKER_ISSUE_MAX_WIDTH_PX)
    : fitWidth(teams.map((team) => team.name), TEAM_PICKER_REST_PX, TEAM_PICKER_MIN_WIDTH_PX,
      TEAM_PICKER_MAX_WIDTH_PX),
  teamsHeightFor({ teams, issue }), where ?? null, { part: "teams", teams, issue });
  return issue && anchor ? lightRow(issue, overlay, undefined, anchor) : overlay;
}

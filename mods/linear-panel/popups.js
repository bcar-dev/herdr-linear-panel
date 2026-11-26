// Opens the mod's popups: each one's size, where it goes, and the props its part is built from (see main.js)
import { openOverlay } from "herdr";
import { MOD, PICK_MAX_ROWS, PICK_ROW_HEIGHT_PX, copiesFor } from "./config.js";
import { light, opened, projectMembersOf } from "./channel.js";
import { Side } from "./enums.js";
import { choiceRows } from "./lib/choices.js";
import { CONTROL_GAP_PX, EDGE_MARGIN_PX, SUBMENU_GAP_PX, fitWidth, listFit, place, sideOf } from "./lib/placement.js";
import { zoom } from "./ui.js";
import { heightFor as choicesHeightFor } from "./parts/commands.js";
import { heightFor as commentHeightFor } from "./parts/comment-menu.js";
import { chromeFor, listHeightFor, shownLabels } from "./parts/label-picker.js";
import { copyHeightFor, menuHeightFor } from "./parts/issue-menu.js";
import { heightFor as teamsHeightFor } from "./parts/team-picker.js";

const COMMANDS_DIALOG_HEIGHT_PX = 380, COMMANDS_DIALOG_WIDTH_PX = 460;
const COMMENT_MENU_WIDTH_PX = 240;
const COPY_MENU_LABEL_REST_PX = 130, COPY_MENU_MAX_WIDTH_PX = 340, COPY_MENU_MIN_WIDTH_PX = 220;
const DISPLAY_HEIGHT_PX = 138, DISPLAY_WIDTH_PX = 280;
const ISSUE_MENU_WIDTH_PX = 228;
const LABELS_MAX_WIDTH_PX = 320, LABELS_MIN_WIDTH_PX = 240, LABELS_REST_PX = 80;
const NARROWEST_POPUP_PX = 190;
const PICK_LABEL_REST_PX = 104, PICK_LEAST_ROWS = 6, PICK_MAX_WIDTH_PX = 300, PICK_MIN_WIDTH_PX = 208;
const START_PROMPT_HEIGHT_PX = 80, START_PROMPT_WIDTH_PX = 280;
const TEAM_PICKER_ISSUE_MAX_WIDTH_PX = 320, TEAM_PICKER_ISSUE_MIN_WIDTH_PX = 220, TEAM_PICKER_ISSUE_REST_PX = 120;
const TEAM_PICKER_MAX_WIDTH_PX = 300, TEAM_PICKER_MIN_WIDTH_PX = 200, TEAM_PICKER_REST_PX = 96;

// `where` is { point, frame } or { beside, frame }, as lib/placement.js reads it. Without one, at the pointer
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
    ? { above: where.below, frame: where.frame } : where;
  return popupAt(fitted, height, side ? spot(side, fitted, height) : "pointer", props);
};

/**
 * @param {Where} where
 * @param {number} width
 * @param {number} height
 */
const spot = (where, width, height) => place(where, width * zoom(), height * zoom());

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
 */
function lightRow(issue, overlay, parent) {
  if (!parent) light(issue, overlay);
  return overlay;
}

/**
 * @param {Issue[]} issues
 * @param {Team[]} teams
 * @param {string} me
 * @param {Where} where
 * @param {string | null} agent
 */
export function openIssueMenu(issues, teams, me, where, agent) {
  const height = menuHeightFor({ issues, teams, agent });
  // The menu is told where it opened: a page asked for by its key takes the menu's place there
  const at = where ? spot(where, ISSUE_MENU_WIDTH_PX, height) : "pointer";
  const origin = at === "pointer" ? undefined : at;
  const props = { part: /** @type {const} */ ("issue-menu"), issues, teams, me, agent, frame: where?.frame, origin };
  const overlay = popupAt(ISSUE_MENU_WIDTH_PX, height, at, props);
  return issues.length === 1 ? lightRow(issues[0], overlay) : overlay;
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
  return lightRow(issue, popup(START_PROMPT_WIDTH_PX, START_PROMPT_HEIGHT_PX, where, { part: "start", issue, agent }));
}

// `bare` leaves out the chip naming the issue: beside the issue menu, which names it, and from a control of the row
// itself, which stays lit
/**
 * @param {Issue[]} targets
 * @param {Team[]} teams
 * @param {Property} page
 * @param {string} me
 * @param {Where} where
 * @param {{ parent?: string, bare?: boolean }} options
 */
export function openChoices(targets, teams, page, me, where, { parent, bare = Boolean(parent) } = {}) {
  const list = choiceRows(page, { targets, teams, me, projectMembers: projectMembersOf(targets) });
  const labels = list.map((row) => [row.label, row.note].filter(Boolean)
    .join(" "));
  const groups = new Set(list.map((row) => row.group)).size;
  const extra = choicesHeightFor({ groups, bare, visible: 0 });
  const rows = Math.min(labels.length, PICK_MAX_ROWS);
  let visible = rows;
  if (where?.below && where.frame) {
    const { below: control, frame } = where, scale = zoom();
    const fit = listFit({ below: (frame.y + frame.height - control.y - control.height) / scale - CONTROL_GAP_PX,
      above: (control.y - frame.y) / scale - CONTROL_GAP_PX }, rows, PICK_ROW_HEIGHT_PX, extra,
    PICK_LEAST_ROWS);
    visible = fit.visible;
    if (fit.side === Side.ABOVE) where = { above: control, frame };
  } else if (where?.beside && where.frame) {
    const room = (where.frame.y + where.frame.height - where.beside.y) / zoom() - CONTROL_GAP_PX - extra;
    visible = Math.max(Math.min(PICK_LEAST_ROWS, rows), Math.min(rows, Math.floor(room / PICK_ROW_HEIGHT_PX)));
  }
  const height = choicesHeightFor({ groups, bare, visible });
  const width = fitWidth(labels, PICK_LABEL_REST_PX, PICK_MIN_WIDTH_PX, PICK_MAX_WIDTH_PX);
  const overlay = popup(width, height, where,
    { part: "commands", targets, teams, page, me, compact: true, bare, parent, visible });
  return targets.length === 1 ? lightRow(targets[0], overlay, parent) : overlay;
}

/**
 * @param {Issue[]} targets
 * @param {Team[]} teams
 * @param {Page} page
 * @param {string} me
 */
export function openCommands(targets, teams, page, me) {
  const overlay = openOverlay({ mod: MOD, kind: "dialog", frame: "none", width: COMMANDS_DIALOG_WIDTH_PX,
    height: COMMANDS_DIALOG_HEIGHT_PX,
    props: { part: "commands", targets, teams, page, me } });
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
 * @param {{ group?: string, parent?: string }} [options]
 */
export function openLabels(issue, labels, frequent, where, { group, parent } = {}) {
  const searchable = Boolean(group && !parent);
  const width = fitWidth(shownLabels(labels, group)
    .map((label) => label.name), LABELS_REST_PX, LABELS_MIN_WIDTH_PX,
  LABELS_MAX_WIDTH_PX);
  const chrome = chromeFor({ group, searchable });
  const room = where.beside && where.frame
    ? (where.frame.y + where.frame.height - where.beside.y) / zoom() - CONTROL_GAP_PX - chrome : Infinity;
  const list = listHeightFor({ issue, labels, frequent, group }, room);
  return popup(width, list + chrome, where, { part: "labels", issue, labels, frequent, group, parent, list,
    searchable, frame: where.frame });
}

/**
 * @param {Issue} issue
 * @param {PageComment} comment
 * @param {boolean} own
 * @param {Where} where
 */
export const openCommentMenu = (issue, comment, own, where) =>
  popup(COMMENT_MENU_WIDTH_PX, commentHeightFor({ comment, own }), where,
    { part: "comment-menu", issue, comment, own });

/**
 * @param {MyTeam[]} teams
 * @param {Issue} [issue]
 * @param {Where} [where]
 */
export const openTeamPicker = (teams, issue, where) =>
  popup(issue
    ? fitWidth(teams.map((team) => team.name), TEAM_PICKER_ISSUE_REST_PX, TEAM_PICKER_ISSUE_MIN_WIDTH_PX,
      TEAM_PICKER_ISSUE_MAX_WIDTH_PX)
    : fitWidth(teams.map((team) => team.name), TEAM_PICKER_REST_PX, TEAM_PICKER_MIN_WIDTH_PX,
      TEAM_PICKER_MAX_WIDTH_PX),
  teamsHeightFor({ teams, issue }), where ?? null, { part: "teams", teams, issue });

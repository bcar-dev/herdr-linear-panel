// Opens the mod's popups: each one's size, where it goes, and the props its part is built from (see main.js).
// A popup is as big as it is told here, so every height below follows what its part draws.
import { openOverlay } from "herdr";
import { MENU_ROW, MOD, PRIORITIES, copiesFor } from "./config.js";
import { light, opened } from "./channel.js";
import { fitWidth, place } from "./lib/placement.js";
import { zoom } from "./ui.js";
import { cycleName, cycleNote, pickable } from "./lib/cycles.js";
import { changeable, commonCycles, commonEstimates, commonMembers, commonStates, estimateLabel } from "./lib/teams.js";

// `where` is { point, frame } or { beside, frame }, as lib/placement.js reads it. Without one, at the pointer.
/**
 * @param {number} width
 * @param {number} height
 * @param {Where | null | undefined} where
 * @param {PopupProps} props
 */
const popup = (width, height, where, props) =>
  popupAt(width, height, where ? spot(where, width, height) : "pointer", props);

// Where a popup of that size goes. In the window it takes its size times the zoom, and `where` is in window pixels.
/**
 * @param {Where} where
 * @param {number} width
 * @param {number} height
 */
const spot = (where, width, height) => place(where, width * zoom(), height * zoom());

// Opens a popup at that spot and lists it as open at once: its own copy only starts a moment later, and until then
// the menu that opened it would take it for closed. Its part draws the box around it (parts/menu.js).
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

// A popup on one issue keeps that issue's row lit. A page opened beside a menu (`parent`) leaves that to the menu.
/**
 * @param {Issue} issue
 * @param {string} overlay
 * @param {string} [parent]
 */
function lighting(issue, overlay, parent) {
  if (!parent) light(issue, overlay);
  return overlay;
}

// Every opener answers its overlay's id.

// `teams` are the loaded teams of these issues.
/**
 * @param {Issue[]} issues
 * @param {Team[]} teams
 * @param {string} me
 * @param {Where} where
 * @param {string | null} agent
 */
export function openIssueMenu(issues, teams, me, where, agent) {
  const single = issues.length === 1, starts = single && agent !== null;
  // Its rows are the properties and Copy, then for one issue Open, and Start under a rule of its own when there is
  // an agent to start (`agent` is its name), all under a caption and a first rule.
  const rows = changeable(teams).length + 1 + (single ? 1 : 0) + (starts ? 1 : 0);
  const height = rows * MENU_ROW + (starts ? 56 : 47);
  // The menu is told where it opened: a page asked for by its key takes the menu's place there.
  const at = where ? spot(where, 228, height) : "pointer";
  const origin = at === "pointer" ? undefined : at;
  const props = { part: /** @type {const} */ ("issue-menu"), issues, teams, me, agent, frame: where?.frame, origin };
  const overlay = popupAt(228, height, at, props);
  return single ? lighting(issues[0], overlay) : overlay;
}

/**
 * @param {Issue[]} issues
 * @param {Where} where
 * @param {string} parent
 */
export function openCopyMenu(issues, where, parent) {
  const entries = copiesFor(issues.length);
  // Beside a label: the icon, the keys of the shortcut and the menu's padding.
  const width = fitWidth(entries.map((entry) => entry.label), 130, 220, 340);
  return popup(width, entries.length * MENU_ROW + 12, where, { part: "copy-menu", issues, parent });
}

// `agent` is the name of the agent that will be started.
/**
 * @param {Issue} issue
 * @param {Where} where
 * @param {string} agent
 */
export function openStartPrompt(issue, where, agent) {
  return lighting(issue, popup(280, 80, where, { part: "start", issue, agent }));
}

// The choices for one property of these issues: one page of the command window, as a popup.
// `bare` leaves out the chip naming the issue: beside the issue menu, which names it, and from a control of the row
// itself, which stays lit.
/**
 * @param {Issue[]} targets
 * @param {Team[]} teams
 * @param {Property} page
 * @param {string} me
 * @param {Where} where
 * @param {{ parent?: string, bare?: boolean }} options
 */
export function openChoices(targets, teams, page, me, where, { parent, bare = Boolean(parent) } = {}) {
  const labels = {
    status: () => commonStates(teams).map((state) => state.name),
    priority: () => PRIORITIES.map(([, label]) => label),
    estimate: () => [null, ...commonEstimates(teams)].map((value) => estimateLabel(teams[0], value) ?? "No estimate"),
    assign: () => commonMembers(teams).map((member) => member.displayName || member.name),
    cycle: () => {
      const cycles = commonCycles(teams), now = Date.now();
      return ["No cycle",
        ...pickable(cycles, now).map((cycle) => `${cycleName(cycle)} ${cycleNote(cycle, cycles, now)}`)];
    },
  }[page]();
  const height = 48 + Math.min(labels.length, 16) * 32 + (bare ? 0 : 28);
  // Beside a label: the icon, the mark of the value the issues have, the key and the window's padding.
  const width = fitWidth(labels, 104, 208, 300);
  const overlay = popup(width, height, where,
    { part: "commands", targets, teams, page, me, compact: true, bare, parent });
  return targets.length === 1 ? lighting(targets[0], overlay, parent) : overlay;
}

// The command window on these issues, opened at its list of actions or straight at one of their pages.
/**
 * @param {Issue[]} targets
 * @param {Team[]} teams
 * @param {Page} page
 * @param {string} me
 */
export function openCommands(targets, teams, page, me) {
  const overlay = openOverlay({ mod: MOD, kind: "dialog", frame: "none", width: 460, height: 380,
    props: { part: "commands", targets, teams, page, me } });
  opened(overlay);
  return overlay;
}

// `where.point` is where its top right corner goes.
/**
 * @param {Display} display
 * @param {(Where & { point: Point }) | undefined} where
 */
export const openDisplayOptions = (display, where) =>
  popup(280, 138, where && { ...where, point: { x: where.point.x - 280 * zoom(), y: where.point.y } },
    { part: "display", display });

/** @param {MyTeam[]} teams */
export const openTeamPicker = (teams) =>
  popup(fitWidth(teams.map((team) => team.name), 96, 200, 300), teams.length * MENU_ROW + 38, null,
    { part: "teams", teams });

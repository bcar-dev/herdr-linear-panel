// How tall the issue menu, its Copy page and the label picker are, which popups.js reckons before it opens them. Kept
// apart from those parts, which open popups themselves: popups.js importing them would import itself back
import { MENU_RULE_HEIGHT_PX, copiesFor } from "../config.js";
import { shownLabels, wornRows } from "../lib/labels.js";
import { changeable } from "../lib/teams.js";
import { FRAME_PADDING_PX } from "./menu.js";
import { Height } from "../style.js";

const LEAST_ROWS = 4;
const ROOT_CHROME_PX = 52;
const ROOT_EXTRA_PX = 60;
const SEARCH_CHROME_PX = 55;
const MENU_CHROME_PX = 47, START_CHROME_PX = 56;

// Its rows are the properties and Copy, then for one issue Open, and Start under a rule of its own when there is an
// agent to start (`agent` is its name), all under a caption and a first rule
/** @param {{ issues: Issue[], teams: Team[], agent: string | null }} props */
export function menuHeightFor({ issues, teams, agent }) {
  const single = issues.length === 1, starts = single && agent !== null;
  const rows = changeable(teams).length + 1 + (single ? 1 : 0) + (starts ? 1 : 0);
  return rows * Height.MENU_ROW + (starts ? START_CHROME_PX : MENU_CHROME_PX);
}

/** @param {{ issues: Issue[] }} props */
export const copyHeightFor = ({ issues }) =>
  copiesFor(issues.length).length * Height.MENU_ROW + FRAME_PADDING_PX;

// What the page has besides its list: the frame, and for a group opened from the issue's labels a search line
/** @param {{ group?: string, searchable: boolean }} props */
export const chromeFor = ({ group, searchable }) =>
  (group ? (searchable ? SEARCH_CHROME_PX : FRAME_PADDING_PX) : ROOT_CHROME_PX);

/**
 * @param {{ issue: Issue, labels: AnyLabel[], frequent: string[], group?: string }} props
 * @param {number} room the height left for the list
 */
export function listHeightFor({ issue, labels, frequent, group }, room) {
  const rows = shownLabels(labels, group).length + (group || !frequent.length ? 0 : frequent.length + 1);
  const entries = group ? 0 : wornRows(labels, issue.labels.nodes.map((label) => label.id)).length;
  const worn = entries ? entries * Height.MENU_ROW + MENU_RULE_HEIGHT_PX : 0;
  const wanted = rows * Height.MENU_ROW + (group ? 0 : ROOT_EXTRA_PX) + worn;
  return Math.min(wanted, Math.max(LEAST_ROWS * Height.MENU_ROW, Math.floor(room)));
}

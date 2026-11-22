// Names, sizes and option lists that more than one file of the mod needs.
import { copyCaps } from "./lib/keys.js";

// The name of this mod's folder under Herdr's home, which addresses its files and overlays: rename the folder with it.
export const MOD = "linear-panel";

// One of this mod's icons, and one of those of the chrome that ships with Herdr.
/** @param {string} name */
export const icon = (name) => `mods/${MOD}/icons/${name}.svg`;
/** @param {string} name */
export const shipped = (name) => `mods/workspace-chrome/${name}.svg`;
// The tracker's logo, as the tracker publishes it (brand/README.md): the white one on a dark theme.
/** @param {boolean} onDark */
export const logo = (onDark) => `mods/${MOD}/brand/logo-${onDark ? "light" : "dark"}.svg`;

export const RELOAD_EVERY = 60_000;
// A spinner stays at least this long: an answer often comes too fast for it to be seen.
export const MIN_SPIN = 600;
// The height of one menu entry. popups.js sizes the menus by it.
export const MENU_ROW = 31;

// The views, in the order of their pills and of the digit keys that pick them: the first is "1", and a view added
// here gets the next digit. A view is its key and label here, its icon (icons/view-<key>.svg), an alias of that name
// in the issues query (api.js) and its filter (lib/listing.js).
/** @type {[ViewKey, string][]} */
export const VIEWS = [["cycle", "Current cycle"], ["all", "My issues"]];

/** @type {[Display["by"], string][]} */
export const ORDERINGS = [["priority", "Priority"], ["title", "Title"], ["status", "Status"]];
/** @type {[Display["completed"], string][]} */
export const COMPLETED = [
  ["all", "All"], ["day", "Past day"], ["week", "Past week"], ["month", "Past month"], ["cycle", "Current cycle"],
    ["none", "None"],
];

/** @type {[number, string][]} */
export const PRIORITIES = [[0, "No priority"], [1, "Urgent"], [2, "High"], [3, "Medium"], [4, "Low"]];

// The Copy menu's entries: what each copies (also the name of its icon, copy-<what>.svg), and its label for one issue
// and for several (null when it is not offered for several). Their shortcuts are in lib/keys.js.
/** @type {{ what: CopyWhat, one: string, many: string | null }[]} */
const COPIES = [
  { what: "id", one: "Copy ID", many: "Copy IDs" },
  { what: "url", one: "Copy URL", many: "Copy URLs" },
  { what: "title", one: "Copy title", many: "Copy titles" },
  { what: "link", one: "Copy title as link", many: "Copy titles as links" },
  { what: "markdown", one: "Copy issue as Markdown", many: "Copy issues as Markdown" },
  { what: "everything", one: "Copy everything as Markdown", many: "Copy everything as Markdown" },
  { what: "branch", one: "Copy git branch name", many: "Copy git branch name" },
  { what: "prompt", one: "Copy as prompt", many: null },
];

// The Copy entries offered for that many issues, each with the label that fits: [{ what, label, keys }].
/** @param {number} count */
export const copiesFor = (count) => COPIES.flatMap(({ what, one, many }) => {
  const label = count === 1 ? one : many;
  return label ? [{ what, label, keys: copyCaps(what) }] : [];
});

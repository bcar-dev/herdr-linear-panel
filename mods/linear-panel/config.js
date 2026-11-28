// Names, sizes and option lists that more than one file of the mod needs
import { Completed, CopyWhat, Ordering, ViewKey } from "./enums.js";
import { copyCaps } from "./lib/keys.js";

// The name of this mod's folder under Herdr's home, which addresses its files and overlays: rename the folder with it
export const MOD = "linear-panel";

/** @param {string} name */
export const icon = (name) => `mods/${MOD}/icons/${name}.svg`;
/** @param {string} name */
export const shipped = (name) => `mods/workspace-chrome/${name}.svg`;
// The tracker's logo, as the tracker publishes it (brand/README.md)
/** @param {boolean} onDark */
export const logo = (onDark) => `mods/${MOD}/brand/logo-${onDark ? "light" : "dark"}.svg`;

// The color of what has none of its own: a state, a team, a draft merge request
export const NEUTRAL_GREY = "#8a8f98";

export const MIN_SPIN_MS = 600;
export const RELOAD_EVERY_MS = 60_000;
export const TOAST_MS = 1500;

// Also the height of the row of pills and buttons the list starts with: the display options open under it
export const HEADER_HEIGHT_PX = 42;
export const MENU_ROW_HEIGHT_PX = 31;
export const MENU_RULE_HEIGHT_PX = 9;
// The lines that say what failed
export const NOTE_TEXT_PX = 12;
export const PICK_HEAD_HEIGHT_PX = 32;
export const PICK_MAX_ROWS = 16;
// 1 is a list, 3 makes 2 rows of 3 (lib/grid.js)
export const PROPERTY_COLUMNS = 3;

// The first view is "1", and a view added here gets the next digit. A view is its key, label and icon here, an alias of
// its key in the issues query (api.js) and its filter (lib/listing.js)
/** @type {{ id: ViewKey, label: string, icon: string }[]} */
export const VIEWS = [
  { id: ViewKey.CYCLE, label: "Current cycle", icon: "view-cycle" },
  { id: ViewKey.ALL, label: "My issues", icon: "view-all" },
];

/** @type {NamedOption<Completed>[]} */
export const COMPLETED = [
  { id: Completed.ALL, label: "All" }, { id: Completed.DAY, label: "Past day" },
  { id: Completed.WEEK, label: "Past week" }, { id: Completed.MONTH, label: "Past month" },
  { id: Completed.CYCLE, label: "Current cycle" }, { id: Completed.NONE, label: "None" },
];
/** @type {NamedOption<Ordering>[]} */
export const ORDERINGS = [
  { id: Ordering.PRIORITY, label: "Priority" }, { id: Ordering.TITLE, label: "Title" },
  { id: Ordering.STATUS, label: "Status" },
];

/** @type {{ id: number, label: string, icon: string }[]} */
export const PRIORITIES = [
  { id: 0, label: "No priority", icon: "priority-0" }, { id: 1, label: "Urgent", icon: "priority-1" },
  { id: 2, label: "High", icon: "priority-2" }, { id: 3, label: "Medium", icon: "priority-3" },
  { id: 4, label: "Low", icon: "priority-4" },
];

// An issue without a priority has the first one
/** @param {number | null | undefined} priority */
export const priorityEntry = (priority) => PRIORITIES.find(({ id }) => id === priority) ?? PRIORITIES[0];

// `many` is null when it is not offered for several issues
// `page` is its label on an issue's page, which has the entries that name one
// Their shortcuts are in lib/keys.js
/**
 * @type {{ what: CopyWhat, icon: string, one: string, many: string | null, done: string, doneMany: string | null,
 *   page?: string }[]}
 */
const COPIES = [
  { what: CopyWhat.ID, icon: "copy-id", one: "Copy ID", many: "Copy IDs", done: "Copied ID", doneMany: "Copied IDs",
    page: "Copy issue ID" },
  { what: CopyWhat.URL, icon: "copy-url", one: "Copy URL", many: "Copy URLs", done: "Copied URL",
    doneMany: "Copied URLs", page: "Copy issue URL" },
  { what: CopyWhat.TITLE, icon: "copy-title", one: "Copy title", many: "Copy titles", done: "Copied title",
    doneMany: "Copied titles" },
  { what: CopyWhat.LINK, icon: "copy-link", one: "Copy title as link", many: "Copy titles as links",
    done: "Copied title as link", doneMany: "Copied titles as links" },
  { what: CopyWhat.MARKDOWN, icon: "copy-markdown", one: "Copy issue as Markdown", many: "Copy issues as Markdown",
    done: "Copied issue as Markdown", doneMany: "Copied issues as Markdown" },
  { what: CopyWhat.EVERYTHING, icon: "copy-everything", one: "Copy everything as Markdown",
    many: "Copy everything as Markdown", done: "Copied everything as Markdown",
    doneMany: "Copied everything as Markdown" },
  { what: CopyWhat.BRANCH, icon: "copy-branch", one: "Copy git branch name", many: "Copy git branch name",
    done: "Copied git branch name", doneMany: "Copied git branch name", page: "Copy git branch name" },
  { what: CopyWhat.DIFFS, icon: "copy-diffs", one: "Copy diff links", many: "Copy diff links",
    done: "Copied diff links", doneMany: "Copied diff links" },
  { what: CopyWhat.PROMPT, icon: "copy-prompt", one: "Copy as prompt", many: null, done: "Copied as prompt",
    doneMany: null, page: "Copy as prompt" },
];

/** @type {CopyWhat[]} */
export const PAGE_COPY_ORDER = [CopyWhat.URL, CopyWhat.ID, CopyWhat.BRANCH, CopyWhat.PROMPT];

// Each entry is { what, icon, label, keys }, in the order of PAGE_COPY_ORDER
export const pageCopies = () => PAGE_COPY_ORDER.map((what) => {
  const { icon: name, page } = /** @type {typeof COPIES[number]} */ (COPIES.find((entry) => entry.what === what));
  return { what, icon: name, label: /** @type {string} */ (page), keys: copyCaps(what) };
});

// Each entry is { what, icon, label, done, keys }, its label and its done wording the ones that fit
/** @param {number} count */
export const copiesFor = (count) => COPIES.flatMap(({ what, icon: name, one, many, done, doneMany }) => {
  const label = count === 1 ? one : many;
  const result = count === 1 ? done : /** @type {string} */ (doneMany);
  return label ? [{ what, icon: name, label, done: result, keys: copyCaps(what) }] : [];
});

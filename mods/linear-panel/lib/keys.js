// What a key press means. Pure rules with no calls to Herdr, so node can test them (tests/unit)
import { CopyWhat, KeyAction, Property } from "../enums.js";

/** @param {KeyEvent} event */
export const spelled = (event) => (event.modifiers.shift ? event.key.toUpperCase() : event.key);

// Whether none of Control, Alt and the platform key is held: a plain letter, with Shift or not
/** @param {KeyEvent["modifiers"]} modifiers */
export const unmodified = (modifiers) => !modifiers.control && !modifiers.alt && !modifiers.platform;

// Whether the command key is down: Cmd on a Mac, Ctrl elsewhere
/**
 * @param {KeyEvent["modifiers"]} modifiers
 * @param {boolean} mac
 */
export const commandDown = (modifiers, mac) => (mac ? modifiers.platform : modifiers.control);

// Whether the command key is down alone, the other of Cmd and Ctrl not
/**
 * @param {KeyEvent["modifiers"]} modifiers
 * @param {boolean} mac
 */
const commandHeld = (modifiers, mac) =>
  (mac ? modifiers.platform && !modifiers.control : modifiers.control && !modifiers.platform);

// The key is as `spelled` names it, the caps as menus show it. This is the one place a property's shortcut is written
/** @type {{ page: Property, label: string, key: string, caps: string[], icon: string }[]} */
export const PROPERTIES = [
  { page: Property.STATUS, label: "Status", key: "s", caps: ["S"], icon: "status" },
  { page: Property.PRIORITY, label: "Priority", key: "p", caps: ["P"], icon: "priority-2" },
  { page: Property.ASSIGN, label: "Assignee", key: "a", caps: ["A"], icon: "assign" },
  { page: Property.ESTIMATE, label: "Estimate", key: "E", caps: ["⇧", "E"], icon: "estimate" },
  { page: Property.CYCLE, label: "Cycle", key: "C", caps: ["⇧", "C"], icon: "cycle" },
];
/** @type {Record<string, Property>} */
const PROPERTY_OF_KEY = Object.fromEntries(PROPERTIES.map(({ page, key }) => [key, page]));

/** @param {KeyEvent} event */
export const propertyOf = (event) => PROPERTY_OF_KEY[spelled(event)];

// { key, caps }: the key obeyed and the keys shown
/** @param {Property} page */
export function propertyKey(page) {
  const { key, caps } = /** @type {typeof PROPERTIES[number]} */ (PROPERTIES.find((entry) => entry.page === page));
  return { key, caps };
}

// { what, keys, held, caps }: always under the command key; caps are shown after Cmd or Ctrl. A shifted or Alt-ed
// key is listed under every spelling a keyboard may report
/** @type {CopyKey[]} */
const COPY_KEYS = [
  { what: CopyWhat.ID, keys: ["."], held: {}, caps: ["."] },
  { what: CopyWhat.URL, keys: [",", "<"], held: { shift: true }, caps: ["⇧", ","] },
  { what: CopyWhat.TITLE, keys: ["'", '"'], held: { shift: true }, caps: ["⇧", "'"] },
  { what: CopyWhat.LINK, keys: ["c"], held: {}, caps: ["C"] },
  { what: CopyWhat.MARKDOWN, keys: ["m", "µ"], held: { alt: true }, caps: ["⌥", "M"] },
  { what: CopyWhat.EVERYTHING, keys: ["c", "ç"], held: { alt: true }, caps: ["⌥", "C"] },
  { what: CopyWhat.BRANCH, keys: [".", ">"], held: { shift: true }, caps: ["⇧", "."] },
  { what: CopyWhat.DIFFS, keys: ["x", "≈"], held: { alt: true }, caps: ["⌥", "X"] },
  { what: CopyWhat.PROMPT, keys: ["p", "π"], held: { alt: true }, caps: ["⌥", "P"] },
];

// Null when the entry has no shortcut
/** @param {CopyWhat} what */
export const copyCaps = (what) => COPY_KEYS.find((entry) => entry.what === what)?.caps ?? null;

/**
 * @param {KeyEvent} event
 * @param {boolean} mac
 */
export function copyShortcut(event, mac) {
  const modifiers = event.modifiers, key = event.key.toLowerCase();
  if (!commandHeld(modifiers, mac)) return null;
  /** @param {CopyKey} entry */
  const held = ({ keys, held: want }) => keys.includes(key) && Boolean(want.shift) === Boolean(modifiers.shift) &&
    Boolean(want.alt) === Boolean(modifiers.alt);
  return COPY_KEYS.find(held)?.what ?? null;
}

// What a key press in the panel asks for, as { do, ... }, or null when the key is not the panel's.
// `views` is how many views there are, `ticked` whether issues are ticked, `pointed` whether the pointer is on an
// issue, `aimed` whether a copy shortcut has issues to act on (the ticked ones, else the pointed one)
/**
 * @param {KeyEvent} event
 * @param {{ mac: boolean, views: number, ticked: boolean, pointed: boolean, aimed: boolean }} state
 * @returns {KeyAsk | null}
 */
export function panelKey(event, { mac, views, ticked, pointed, aimed }) {
  const modifiers = event.modifiers, page = PROPERTY_OF_KEY[spelled(event)], nth = Number(event.key) - 1;
  const what = copyShortcut(event, mac);
  if (commandHeld(modifiers, mac) && !modifiers.alt && !modifiers.shift && event.key === "k") {
    return { do: KeyAction.COMMANDS };
  }
  if (what && aimed) return { do: KeyAction.COPY, what };
  if (!unmodified(modifiers)) return null;
  // Shift+c is the cycle's key, not this one
  if (spelled(event) === "c") return { do: KeyAction.COMPOSE };
  if (event.key === "r") return { do: KeyAction.RELOAD };
  if (spelled(event) === "V") return { do: KeyAction.DISPLAY };
  if (Number.isInteger(nth) && nth >= 0 && nth < views) return { do: KeyAction.VIEW, nth };
  if (page && ticked) return { do: KeyAction.COMMANDS, page };
  if (page && pointed) return { do: KeyAction.CHOOSE, page };
  if (event.key === "i" && (ticked || pointed)) return { do: KeyAction.UNASSIGN };
  if (event.key.toLowerCase() === "x" && pointed) return { do: KeyAction.TICK, extend: Boolean(modifiers.shift) };
  if (event.key === "down" || event.key === "up") return { do: KeyAction.MOVE, by: event.key === "down" ? 1 : -1 };
  if (event.key === "enter" && pointed) return { do: KeyAction.OPEN };
  if (event.key === "escape" && ticked) return { do: KeyAction.UNTICK };
  return null;
}

// The other spellings a key can be reported in, by the key as a shortcut shows it: Shift turns "," into "<", Option
// turns "P" into "π"
/** @type {Record<string, string[]>} */
const SPELLINGS = { ",": [",", "<"], ".": [".", ">"], "'": ["'", '"'], p: ["p", "π"], c: ["c", "ç"],
  m: ["m", "µ"], x: ["x", "≈"] };

// A cap is a modifier's sign or name, or the key itself. `held` is the modifiers held and the last key pressed
/**
 * @param {string} cap
 * @param {{ modifiers: KeyEvent["modifiers"], key: string | null }} held
 * @param {boolean} mac
 */
export function capHeld(cap, { modifiers, key }, mac) {
  if (cap === "\u2318" || cap === "Ctrl") return commandDown(modifiers, mac);
  if (cap === "\u21E7" || cap === "Shift") return modifiers.shift;
  if (cap === "\u2325" || cap === "Alt") return modifiers.alt;
  const lower = cap.toLowerCase();
  return key !== null && (SPELLINGS[lower] ?? [lower]).includes(key.toLowerCase());
}

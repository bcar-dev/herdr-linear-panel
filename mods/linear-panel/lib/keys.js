// What a key press means. Pure rules with no calls to Herdr, so node can test them (tests/unit).

// A key press as shortcuts spell it here: Shift + e is "E".
/** @param {KeyEvent} e */
export const spelled = (e) => (e.modifiers.shift ? e.key.toUpperCase() : e.key);

// Whether the command key is held (Cmd on macOS, Ctrl elsewhere) and the other of the two is not.
/**
 * @param {KeyEvent["modifiers"]} m
 * @param {boolean} mac
 */
const commandHeld = (m, mac) => (mac ? m.platform && !m.control : m.control && !m.platform);

// The properties whose choices a key opens, in the order menus list them: the page, its label, its key as `spelled`
// names it, and the key as menus show it. This is the one place a property's shortcut is written.
/** @type {[page: Property, label: string, key: string, caps: string[]][]} */
export const PROPERTIES = [
  ["status", "Status", "s", ["S"]],
  ["priority", "Priority", "p", ["P"]],
  ["assign", "Assignee", "a", ["A"]],
  ["estimate", "Estimate", "E", ["⇧", "E"]],
  ["cycle", "Cycle", "C", ["⇧", "C"]],
];
/** @type {Record<string, Property>} */
const PROPERTY_OF_KEY = Object.fromEntries(PROPERTIES.map(([page, , key]) => [key, page]));

// The shortcut of a property: { key, caps }, the key obeyed and the keys shown.
/** @param {Property} page */
export function propertyKey(page) {
  // Found: every property is listed above.
  const [, , key, caps] = /** @type {typeof PROPERTIES[number]} */ (PROPERTIES.find(([property]) => property === page));
  return { key, caps };
}

// The copy shortcuts, by entry of the Copy menu: the key, with Shift or Alt, always under the command key, then the
// keys menus show after Cmd or Ctrl. A shifted or Alt-ed key is listed under every spelling a keyboard may report.
/** @type {CopyKey[]} */
const COPY_KEYS = [
  ["id", ["."], {}, ["."]],
  ["url", [",", "<"], { shift: true }, ["⇧", ","]],
  ["title", ["'", '"'], { shift: true }, ["⇧", "'"]],
  ["link", ["c"], {}, ["C"]],
  ["everything", ["c", "ç"], { alt: true }, ["⌥", "C"]],
  ["branch", [".", ">"], { shift: true }, ["⇧", "."]],
  ["prompt", ["p", "π"], { alt: true }, ["⌥", "P"]],
];

// The keys shown for a Copy entry's shortcut, or null when it has none.
/** @param {CopyWhat} what */
export const copyCaps = (what) => COPY_KEYS.find(([entry]) => entry === what)?.[3] ?? null;

/**
 * @param {KeyEvent} e
 * @param {boolean} mac
 */
export function copyShortcut(e, mac) {
  const m = e.modifiers, key = e.key.toLowerCase();
  if (!commandHeld(m, mac)) return null;
  /** @param {CopyKey} entry */
  const held = ([, keys, want]) => keys.includes(key) && Boolean(want.shift) === Boolean(m.shift) &&
    Boolean(want.alt) === Boolean(m.alt);
  return COPY_KEYS.find(held)?.[0] ?? null;
}

// What a key press in the panel asks for, as { do, ... }, or null when the key is not the panel's.
// `views` is how many views there are, `ticked` whether issues are ticked, `pointed` whether the pointer is on an
// issue, `aimed` whether a copy shortcut has issues to act on (the ticked ones, else the pointed one).
/**
 * @param {KeyEvent} e
 * @param {{ mac: boolean, views: number, ticked: boolean, pointed: boolean, aimed: boolean }} state
 * @returns {KeyAsk | null}
 */
export function panelKey(e, { mac, views, ticked, pointed, aimed }) {
  const m = e.modifiers, page = PROPERTY_OF_KEY[spelled(e)], nth = Number(e.key) - 1, what = copyShortcut(e, mac);
  if (commandHeld(m, mac) && !m.alt && !m.shift && e.key === "k") return { do: "commands" };
  if (what && aimed) return { do: "copy", what };
  if (m.control || m.alt || m.platform) return null;
  // Shift+c is the cycle's key, not this one.
  if (spelled(e) === "c") return { do: "compose" };
  if (e.key === "r") return { do: "reload" };
  if (spelled(e) === "V") return { do: "display" };
  if (Number.isInteger(nth) && nth >= 0 && nth < views) return { do: "view", nth };
  // A property key acts on the ticked issues, else on the issue under the pointer.
  if (page && ticked) return { do: "commands", page };
  if (page && pointed) return { do: "choose", page };
  if (e.key === "i" && (ticked || pointed)) return { do: "unassign" };
  // With Shift, x ticks the range, as a Shift+click on the box does.
  if (e.key.toLowerCase() === "x" && pointed) return { do: "tick", extend: Boolean(m.shift) };
  if (e.key === "escape" && ticked) return { do: "untick" };
  return null;
}

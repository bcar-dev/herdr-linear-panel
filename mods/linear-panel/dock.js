// Where the panel sits in the layout: a child of the side panel's stack, beside the panels that ship with Herdr.
import { layout, run, shared, setShared } from "herdr";
import { SLOT } from "./tracker.js";

// The layout's ids for the side panel and the stack of its contents, and the shared list of side panels.
const PANEL = "panel";
const STACK = "panel-body";
const PANELS = "workspace.panels";

/**
 * @param {LayoutNode} node
 * @param {string} id
 * @returns {LayoutNode | null}
 */
function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

export function isShown() {
  const root = /** @type {LayoutNode} */ (layout()), panel = find(root, PANEL);
  return panel !== null && !panel.hidden && find(root, STACK)?.active === SLOT;
}

export function show() {
  run("layout.select", { stack: STACK, child: SLOT });
  run("layout.show", { id: PANEL });
}

export const hide = () => run("layout.hide", { id: PANEL });

// The tab bar restores a space's side panel only when that panel is in this list.
export function register() {
  const panels = /** @type {string[]} */ (shared(PANELS)) ?? ["files", "changes"];
  if (!panels.includes(SLOT)) setShared(PANELS, [...panels, SLOT]);
}

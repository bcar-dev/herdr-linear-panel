// Stand-ins for Herdr's elements. A real element is described by chained calls and drawn by Herdr; a stand-in
// records the calls, so a test can find an element, read what it shows and fire its handlers
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { host } from "./herdr.js";

// The element methods of the Herdr installed on this computer, read from the type file it writes. With them, a call
// to a method that does not exist fails here as it would in Herdr. Null without Herdr: any name passes
function knownMethods() {
  const file = join(process.env.HERDR_APP_HOME ?? join(homedir(), ".config", "herdr-app"), "gpui-kit.d.ts");
  if (!existsSync(file)) return null;
  const names = [...readFileSync(file, "utf8")
    .matchAll(/^\s+(\w+)<Self extends Element>\(this: Self/gm)]
    .map((match) => match[1]);
  return names.length ? new Set(names) : null;
}
const KNOWN = knownMethods();

// What .hover(style) and .focus(style) set, as { method: value }
function styled(restyle) {
  const style = {};
  const recorder = new Proxy({},
    { get: (_target, name) => (value = true) => { style[name] = value; return recorder; } });
  restyle(recorder);
  return style;
}

function record(node, proxy, name, values) {
  if (name === "id") node.id = values[0];
  else if (name === "child") node.children.push(values[0]);
  else if (name === "children") node.children.push(...values[0]);
  else if (name === "when") { if (values[0]) values[1](proxy); }
  else if (name === "hover" || name === "focus") node[name] = styled(values[0]);
  // A mouse button comes before the handler: on_mouse_down("left", handler)
  else if (name.startsWith("on_")) (node.handlers[values.length > 1 ? `${name}:${values[0]}` : name] ??= [])
    .push(values.at(-1));
  else node.style[name] = values.length > 1 ? values : values.length ? values[0] : true;
}

// An element of that kind ("div", "svg", ...). `proxy.$` is what it recorded:
// { kind, args, id, children, handlers, style, hover, focus }
export function element(kind, ...args) {
  const node = { kind, args, id: null, children: [], handlers: {}, style: {}, hover: null, focus: null };
  const proxy = new Proxy(node, {
    get(_node, name) {
      if (name === "$") return node;
      if (typeof name !== "string" || name === "then") return undefined;
      return (...values) => {
        // A text view has methods of its own, which the file of the elements' methods does not list
        if (KNOWN && node.kind !== "TextView" && !KNOWN.has(name)) {
          throw new TypeError(`.${name}() is not an element method of the installed Herdr`);
        }
        record(node, proxy, name, values);
        return proxy;
      };
    },
  });
  return proxy;
}

export function* walk(node) {
  if (!node?.$) return;
  yield node;
  for (const child of node.$.children) yield* walk(child);
}

export function find(root, id) {
  for (const node of walk(root)) if (node.$.id === id) return node;
  return null;
}

export function texts(root) {
  if (typeof root === "string" || typeof root === "number") return [String(root)];
  return (root?.$?.children ?? []).flatMap(texts);
}
export const text = (root) => texts(root)
  .join(" ");

// The file names of the icons under an element, without folder or extension
export const icons = (root) => [...walk(root)].filter((node) => node.$.kind === "svg")
  .map((node) => node.$.args[0].split("/")
    .pop()
    .replace(".svg", ""));

// How many times the copy behind a drawing took the keyboard, read from the focus handle its drawing tracks
export const focuses = (root) => [...walk(root)].find((node) => node.$.style.track_focus).$.style.track_focus.focused;

// The fake state of a drawing's text field (gpui-base.js): a test types in it, submits it and reads its `focused`
export const field = (root) => [...walk(root)].find((node) => node.$.kind === "Input").$.args[0];

function pathTo(root, target) {
  if (root === target) return [root];
  for (const child of root?.$?.children ?? []) {
    const path = pathTo(child, target);
    if (path) return [root, ...path];
  }
  return null;
}

// Sends an event to an element as Herdr does: its handlers run, then those of each element around it, until one
// calls context.stop_propagation(). `event` is the method that listens, with its button if it has one: "on_click",
// "on_mouse_down:left". on_hover is not sent this way: use `hover`
export function send(root, target, event, payload, context) {
  const path = pathTo(root, target);
  assert.ok(path, `the element is not in this drawing (${event})`);
  // Herdr closes a popup or a dialog on Escape before the mod sees the key, unless the mod bound it (an action)
  assert.ok(!(event === "on_key_down" && payload.key === "escape" && root.$.copy?.overlay),
    "Escape never reaches an overlay's key handler");
  // The drawing knows which copy of the mod it belongs to: that copy's props are the ones `props()` answers now
  if ("copy" in root.$) host.props = root.$.copy ?? undefined;
  context.stopped = false;
  for (const node of path.reverse()) {
    for (const handler of node.$.handlers[event] ?? []) handler(payload, context);
    if (context.stopped) break;
  }
}

const NO_KEYS = { shift: false, control: false, alt: false, platform: false };

// A click as Herdr delivers it: the press, the release, then the click, each to whoever listens.
// `position` is where in the window, for the handlers that read it
export function click(root, target, context, modifiers = {}, position = { x: 0, y: 0 }) {
  const pointer = { modifiers: { ...NO_KEYS, ...modifiers }, position };
  for (const event of ["on_mouse_down:left", "on_mouse_up:left", "on_click"]) {
    send(root, target, event, pointer, context);
  }
}
export const press = (root, key, context, modifiers = {}) =>
  send(root, root, "on_key_down", { key, modifiers: { ...NO_KEYS, ...modifiers } }, context);
export function hover(target, on, context) {
  for (const handler of target.$.handlers.on_hover ?? []) handler(on, context);
}

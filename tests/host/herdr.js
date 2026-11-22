// A stand-in for Herdr's "herdr" module. `host` is the fake app behind it: a test sets what the app would answer
// and reads back what the mod asked of it.
export const host = {};

// A fresh app: macOS, the panel showing in the side panel, nothing stored. `changes` overrides any of it.
export function reset(changes = {}) {
  Object.assign(host, {
    props: undefined,
    platform: "macos",
    layout: { id: "root",
      children: [{ id: "panel", hidden: false, children: [{ id: "panel-body", active: "linear" }] }] },
    shared: {},
    settings: { zoom: 1 },
    // The agents people can start, most picked first.
    agents: [
      { key: "claude", name: "Claude Code", run: ["claude"], installed: true },
      { key: "codex", name: "Codex", run: ["codex", "--no-daemon"], installed: true },
    ],
    stored: {},
    files: {},
    spaces: [],
    panes: [],
    focused: null,
    // What the mod did, in order: programs run, commands run, notifications posted, overlays opened and closed.
    ran: [],
    commands: [],
    notes: [],
    overlays: [],
    closed: [],
    // The key bindings the mod asked the app for.
    bound: [],
    exec: () => ({ code: 0, stdout: "", stderr: "" }),
    fetch: () => { throw new Error("no fetch set for this test"); },
  }, changes);
  return host;
}
reset();

export const theme = () => new Proxy({}, { get: (_colors, name) => `theme.${String(name)}` });
export const window = () => ({ platform: host.platform });
export const props = () => host.props;
export const layout = () => host.layout;
export const settings = () => host.settings;
export const knownAgents = async () => host.agents;
export const shared = (key) => host.shared[key];
export const setShared = (key, value) => { host.shared[key] = value; return null; };
export const spaces = () => host.spaces;
export const panes = () => host.panes;
export const focused = () => host.focused;
export const home = () => "/home/me";
export const appHome = () => "/home/me/.config/herdr-app";
export const readTextFile = async (path) => host.files[path] ?? null;

export async function exec(command, args = [], options = {}) {
  host.ran.push({ command, args, options });
  return { code: 0, stdout: "", stderr: "", ...(await host.exec(command, args, options)) };
}

export function run(name, args) {
  host.commands.push({ name, args });
  return null;
}

export function notify(note) {
  host.notes.push(note);
  return `note-${host.notes.length}`;
}

export function openOverlay(spec) {
  const id = `overlay-${host.overlays.length + 1}`;
  host.overlays.push({ id, ...spec });
  return id;
}

export function closeOverlay(id) {
  host.closed.push(id);
  return null;
}

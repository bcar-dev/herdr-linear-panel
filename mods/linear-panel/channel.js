// How the mod's popups and its panel talk: through values of Herdr's shared state, since each is its own copy of
// the mod.
//
// A request is { at, ids, kind, ... }: the issues it is about, and one of
//   { kind: "update", input }    the same change on every issue
//   { kind: "status", name }     each issue to its own team's status of that name
//   { kind: "copy", what }       one entry of the Copy menu
//   { kind: "start", text }      a checkout and an agent on the issue
//   { kind: "open" }             the issue's page in the tracker
//   { kind: "compose", team }    the tracker's composer for a new issue of that team (no issue)
//   { kind: "display", change }  display options that changed
import { shared, setShared, closeOverlay } from "herdr";
import { MOD } from "./config.js";

const REQUEST = `${MOD}.request`;
const OPEN_ON = `${MOD}.open`;
const POPUPS = `${MOD}.popups`;
const KEYBOARD = `${MOD}.keyboard`;

// A popup only asks: it is gone before the work ends, and a closing copy's tasks are cancelled. The panel does the
// work. `at` tells one request from the next.
/** @param {PanelRequest} request */
export const ask = (request) => setShared(REQUEST, { at: Date.now(), ...request });

// The popups that are open, by overlay id. Each lists itself when it starts and unlists itself when it goes
// (main.js). While there is one, the panel keeps its focused look, though the popup has the keyboard.
export const popups = () => /** @type {string[]} */ (shared(POPUPS)) ?? [];
/** @param {string} overlay */
export const opened = (overlay) => setShared(POPUPS, [...popups().filter((id) => id !== overlay), overlay]);
/** @param {string} overlay */
export function closed(overlay) {
  if (popups().includes(overlay)) setShared(POPUPS, popups().filter((id) => id !== overlay));
}

// Gives the keyboard back to the panel: left alone, Herdr hands it to the terminal when a popup closes. A popup does
// this as it goes (main.js, which names the two exceptions), since Herdr closes a popup on Escape by itself, without
// the popup's say.
// The popup leaves a stamp in shared state, which the panel reads when it next draws. A direct call from the popup
// to the panel fails: the panel would then run in the popup's turn, where its timers never fire.
// The stamp only has to differ from the last one: two popups can go within the same millisecond.
export const giveBack = () => setShared(KEYBOARD, Date.now() + Math.random());

export const givenBack = () => /** @type {number} */ (shared(KEYBOARD));

/** @param {string} overlay */
export function dismiss(overlay) {
  closed(overlay);
  closeOverlay(overlay);
  giveBack();
}

/**
 * @param {{ overlay: string, parent?: string }} popup
 * @param {Issue[]} issues
 * @param {Ask} request
 */
export function submit({ overlay, parent }, issues, request) {
  ask({ ids: issues.map((issue) => issue.id), ...request });
  dismiss(overlay);
  if (!parent) return;
  closed(parent);
  closeOverlay(parent);
}

export const pending = () => /** @type {PanelRequest} */ (shared(REQUEST));

// The issue a popup is open on: meanwhile the panel keeps that row lit, and the other rows ignore the pointer. The
// popup that lit the row unlights it on closing, unless a later popup took the row over.
/**
 * @param {Issue} issue
 * @param {string} overlay
 */
export const light = (issue, overlay) => setShared(OPEN_ON, { issue: issue.id, owner: overlay });
export const lit = () => /** @type {OpenOn} */ (shared(OPEN_ON))?.issue ?? null;
/** @param {string} overlay */
export function unlight(overlay) {
  if (/** @type {OpenOn} */ (shared(OPEN_ON))?.owner === overlay) setShared(OPEN_ON, null);
}

// The panel starts over: it forgets whatever a popup left behind when Herdr last stopped.
export function reset() {
  if (shared(OPEN_ON)) setShared(OPEN_ON, null);
  if (popups().length) setShared(POPUPS, []);
}

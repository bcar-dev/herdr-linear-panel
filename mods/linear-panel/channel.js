// Each popup and the panel is its own copy of the mod, so they talk through Herdr's shared state. A popup asks with a
// `PanelRequest`, and types.d.ts lists the kinds
import { shared, setShared, closeOverlay } from "herdr";
import { MOD } from "./config.js";

const KEYBOARD = `${MOD}.keyboard`;
const LABELS = `${MOD}.labels`;
const OPEN_ON = `${MOD}.open`;
const POPUPS = `${MOD}.popups`;
const PROJECTS = `${MOD}.projects`;
const REQUESTS = `${MOD}.requests`;
// The requests kept for the panel, which serves the ones it has not yet; older ones are dropped
const REQUESTS_KEPT = 20;

// A popup is gone before the work ends, and a closing copy's tasks are cancelled. `at` tells one request from the next,
// so it grows even when two come within one millisecond
/** @param {PanelRequest} request */
export const ask = (request) => setShared(REQUESTS,
  [...queue()
    .slice(1 - REQUESTS_KEPT), { at: Math.max(Date.now(), (pending()?.at ?? 0) + 1), ...request }]);

/** @typedef {PanelRequest & { at: number }} SentRequest */
const queue = () => /** @type {SentRequest[]} */ (shared(REQUESTS)) ?? [];

// The requests sent after the one made at `at`, oldest first
/** @param {number} at */
export const requestsAfter = (at) => queue()
  .filter((request) => request.at > at);

// By overlay id, listed by each popup as it starts and goes (main.js). While one is open, the panel keeps its focused
// look, though the popup has the keyboard
export const popups = () => /** @type {string[]} */ (shared(POPUPS)) ?? [];
/** @param {string} overlay */
export const opened = (overlay) => setShared(POPUPS, [...popups()
  .filter((id) => id !== overlay), overlay]);
/** @param {string} overlay */
export function closed(overlay) {
  if (popups()
    .includes(overlay)) setShared(POPUPS, popups()
    .filter((id) => id !== overlay));
}

// Left alone, Herdr hands the keyboard to the terminal when a popup closes, and it closes a popup on Escape without
// its say, so a popup gives the keyboard back as it goes (main.js, which names the two exceptions)
// A direct call from the popup to the panel fails: the panel would run in the popup's turn, where its timers never
// fire. So the popup leaves a stamp in shared state, which the panel reads when it next draws. The stamp only has to
// differ from the last one: two popups can go within the same millisecond
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
export function submit(popup, issues, request) {
  ask({ ids: issues.map((issue) => issue.id), ...request });
  closeWithParent(popup);
}

/** @param {{ overlay: string, parent?: string }} popup */
export function closeWithParent({ overlay, parent }) {
  dismiss(overlay);
  if (!parent) return;
  closed(parent);
  closeOverlay(parent);
}

export const pending = () => queue()
  .at(-1);

// While a popup is open on an issue, the panel keeps its row lit and the other rows ignore the pointer. The popup that
// lit the row unlights it on closing, unless a later popup took the row over. Opened from a control of the issue's
// page (its `anchor`), the popup keeps that control lit too
/**
 * @param {Issue} issue
 * @param {string} overlay
 * @param {string} [anchor]
 */
export const light = (issue, overlay, anchor) =>
  setShared(OPEN_ON, { issue: issue.id, owner: overlay, ...(anchor && { anchor }) });
export const lit = () => /** @type {OpenOn} */ (shared(OPEN_ON))?.issue ?? null;
export const litAnchor = () => /** @type {OpenOn} */ (shared(OPEN_ON))?.anchor ?? null;
/** @param {string} overlay */
export function unlight(overlay) {
  if (/** @type {OpenOn} */ (shared(OPEN_ON))?.owner === overlay) setShared(OPEN_ON, null);
}

// Forgets whatever a popup left behind when Herdr last stopped
export function reset() {
  if (shared(OPEN_ON)) setShared(OPEN_ON, null);
  if (popups().length) setShared(POPUPS, []);
}

// Set by the label picker and the pages opened beside it, ahead of the panel's reload. Null for an issue they have
// not touched
/** @param {string} issue */
export const wornLabels = (issue) => {
  const worn = /** @type {{ issue: string, ids: string[] } | undefined} */ (shared(LABELS));
  return worn?.issue === issue ? worn.ids : null;
};
/**
 * @param {string} issue
 * @param {string[]} ids
 */
export const wear = (issue, ids) => setShared(LABELS, { issue, ids });

/** @param {Record<string, Member[]>} members */
export const shareProjects = (members) => setShared(PROJECTS, members);

/** @param {Issue[]} issues */
export function projectMembersOf(issues) {
  const id = issues[0]?.project?.id;
  if (!id || issues.some((issue) => issue.project?.id !== id)) return [];
  return /** @type {Record<string, Member[]> | undefined} */ (shared(PROJECTS))?.[id] ?? [];
}

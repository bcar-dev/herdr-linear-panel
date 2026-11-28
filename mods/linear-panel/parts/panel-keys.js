// What the panel's keys do: the issue's page when one is open, the list otherwise. Each answers by stopping the
// propagation of a key it took
import { VIEWS, PAGE_COPY_ORDER, copiesFor } from "../config.js";
import { KeyAction, RequestKind } from "../enums.js";
import { PAGE_KEYS, copyShortcut, pageShortcut, panelKey, propertyOf } from "../lib/keys.js";
import { isMac } from "../tracker.js";

/**
 * @param {Panel} panel
 * @param {import("./issue-page.js").IssuePage} page
 * @param {KeyEvent} event
 * @param {Context} context
 */
export function detailKey(panel, page, event, context) {
  const { modifiers } = event, mac = isMac(), typing = page.focusedFieldCount > 0;
  const issue = panel.store.index()
    .get(page.issue.id) ?? page.issue;
  const copied = copyShortcut(event, mac), property = propertyOf(event), shortcut = pageShortcut(event, mac);
  if (event.key === "escape" && !typing) panel.closeDetail(context);
  else if (shortcut === PAGE_KEYS.TEAM) panel.openers.pickTeamByKey(issue);
  else if (!typing && copied && PAGE_COPY_ORDER.includes(copied)) {
    panel.requests.perform({ kind: RequestKind.COPY, ids: [page.issue.id], what: copied }, context);
  } else if (!typing && !modifiers.control && !modifiers.alt && !modifiers.platform && property) {
    panel.openers.pickByKey(issue, property);
  } else if (!typing && shortcut === PAGE_KEYS.LABELS) {
    panel.openers.chooseLabelsByKey(issue, context);
  } else return;
  context.stop_propagation();
}

/**
 * @param {Panel} panel
 * @param {KeyEvent} event
 * @param {Context} context
 */
export function listKey(panel, event, context) {
  const { selection, litId } = panel, store = panel.store;
  const hasTicked = selection.size > 0;
  const lit = litId !== null && panel.visibleIds.includes(litId) ? store.index()
    .get(litId) : null;
  const copied = hasTicked ? selection.list() : lit ? [lit.id] : [];
  const asked = panelKey(event,
    { mac: isMac(), viewCount: VIEWS.length, hasTicked, hasLit: Boolean(lit), canCopy: copied.length > 0 });
  if (!asked) return;
  const litIssue = /** @type {Issue} */ (lit);
  switch (asked.do) {
    case KeyAction.COMMANDS: panel.openers.commands(asked.page); break;
    case KeyAction.COPY:
      if (copiesFor(copied.length)
        .some((entry) => entry.what === asked.what)) {
        panel.requests.perform({ kind: RequestKind.COPY, ids: copied, what: asked.what }, context);
      }
      break;
    case KeyAction.COMPOSE: panel.openers.compose(); break;
    case KeyAction.RELOAD: panel.refresh(context); break;
    case KeyAction.DISPLAY: panel.openers.displayOptions(); break;
    case KeyAction.VIEW: panel.show(VIEWS[asked.nth]?.id ?? panel.view, context); break;
    case KeyAction.CHOOSE: panel.openers.chooseByKey(litIssue, asked.page); break;
    case KeyAction.UNASSIGN:
      panel.requests.perform({ kind: RequestKind.UPDATE, ids: hasTicked ? selection.list() : [litIssue.id],
        input: { assigneeId: null } }, context);
      break;
    case KeyAction.UNTICK: selection.clear(); break;
    case KeyAction.TICK: panel.tick(litIssue, asked.extend, context); break;
    case KeyAction.MOVE: panel.moveCursor(asked.by, context); break;
    case KeyAction.OPEN: panel.openDetail(litIssue, context); break;
  }
  context.stop_propagation();
  context.notify();
}

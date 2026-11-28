// What the panel's keys do: the issue's page when one is open, the list otherwise. Each answers by stopping the
// propagation of a key it took
import { VIEWS, PAGE_COPY_ORDER, copiesFor } from "../config.js";
import { KeyAction, RequestKind } from "../enums.js";
import { commandDown, copyShortcut, panelKey, propertyOf, unmodified } from "../lib/keys.js";
import { isMac } from "../tracker.js";

/**
 * @param {Panel} panel
 * @param {import("./issue-page.js").IssuePage} page
 * @param {KeyEvent} event
 * @param {Context} cx
 */
export function detailKey(panel, page, event, cx) {
  const { modifiers } = event, mac = isMac(), typing = page.focusedFieldCount > 0;
  const issue = panel.store.index()
    .get(page.issue.id) ?? page.issue;
  const copied = copyShortcut(event, mac), property = propertyOf(event);
  if (event.key === "escape" && !typing) panel.closeDetail(cx);
  else if (event.key.toLowerCase() === "m" && modifiers.shift && !modifiers.alt && commandDown(modifiers, mac)) {
    panel.openers.pickTeamByKey(issue);
  } else if (!typing && copied && PAGE_COPY_ORDER.includes(copied)) {
    panel.perform({ kind: RequestKind.COPY, ids: [page.issue.id], what: copied }, cx);
  } else if (!typing && !modifiers.control && !modifiers.alt && !modifiers.platform && property) {
    panel.openers.pickByKey(issue, property);
  } else if (!typing && event.key === "l" && unmodified(modifiers) && !modifiers.shift) {
    panel.openers.chooseLabelsByKey(issue, cx);
  } else return;
  cx.stop_propagation();
}

/**
 * @param {Panel} panel
 * @param {KeyEvent} event
 * @param {Context} cx
 */
export function listKey(panel, event, cx) {
  const { selection, hovered } = panel, store = panel.store;
  const ticked = selection.size > 0;
  const under = hovered !== null && panel.visibleIds.includes(hovered) ? store.index()
    .get(hovered) : null;
  const copied = ticked ? selection.list() : under ? [under.id] : [];
  const asked = panelKey(event,
    { mac: isMac(), views: VIEWS.length, ticked, pointed: Boolean(under), aimed: copied.length > 0 });
  if (!asked) return;
  const pointed = /** @type {Issue} */ (under);
  switch (asked.do) {
    case KeyAction.COMMANDS: panel.openers.commands(asked.page); break;
    case KeyAction.COPY:
      if (copiesFor(copied.length)
        .some((entry) => entry.what === asked.what)) {
        panel.perform({ kind: RequestKind.COPY, ids: copied, what: asked.what }, cx);
      }
      break;
    case KeyAction.COMPOSE: panel.openers.compose(); break;
    case KeyAction.RELOAD: panel.refresh(cx); break;
    case KeyAction.DISPLAY: panel.openers.displayOptions(); break;
    case KeyAction.VIEW: panel.show(VIEWS[asked.nth].id, cx); break;
    case KeyAction.CHOOSE: panel.openers.chooseByKey(pointed, asked.page); break;
    case KeyAction.UNASSIGN:
      panel.perform({ kind: RequestKind.UPDATE, ids: ticked ? selection.list() : [pointed.id],
        input: { assigneeId: null } }, cx);
      break;
    case KeyAction.UNTICK: selection.clear(); break;
    case KeyAction.TICK: panel.tick(pointed, asked.extend, cx); break;
  }
  cx.stop_propagation();
  cx.notify();
}

// What the panel does when a popup, a key or a drop asks (channel.js). A request is served from a drawing, where
// nothing may be written, or carried out as work on its issues
import * as api from "../api.js";
import { copy, start } from "../actions.js";
import { TOAST_MS } from "../config.js";
import { RequestKind } from "../enums.js";
import { notify } from "herdr";
import { promptText } from "../lib/start.js";
import { moves } from "../lib/teams.js";
import { composeIssue, openPage } from "../tracker.js";

/** @typedef {Exclude<Work, { kind: "clipboard" | "comment" }> & { ids: string[] }} Performed */

// Whether carrying it out changes issues in the tracker: they are then read back
/** @type {Record<Performed["kind"], boolean>} */
export const MUTATES = {
  [RequestKind.COPY]: false,
  [RequestKind.OPEN]: false,
  [RequestKind.START]: true,
  [RequestKind.STATUS]: true,
  [RequestKind.UPDATE]: true,
};

/**
 * @param {Panel} panel
 * @param {PanelRequest} request
 * @param {Context} cx
 */
export function serve(panel, request, cx) {
  switch (request.kind) {
    case RequestKind.DISPLAY: return panel.redisplay(request.change, cx);
    case RequestKind.COMPOSE: return void composeIssue(request.team);
    case RequestKind.CLIPBOARD: {
      const { text, label } = request;
      return cx.timer.after(0, (cx) => {
        cx.write_to_clipboard(text);
        notify({ title: label, timeout: TOAST_MS });
      });
    }
    case RequestKind.COMMENT: return panel.changeComment(request, cx);
    default: return panel.perform(request, cx);
  }
}

/**
 * @param {Panel} panel
 * @param {Performed} request
 * @param {Issue[]} targets
 * @param {Context} cx
 */
export async function carryOut(panel, request, targets, cx) {
  switch (request.kind) {
    case RequestKind.START: {
      const [issue] = targets;
      if (!issue) return undefined;
      const states = panel.store.teams.get(issue.team.id)?.states ?? [];
      const { pre_linear_issue_prompt: before = panel.settings.start_prompt, post_linear_issue_prompt: after }
        = panel.settings;
      return void await start(issue, states, panel.agent(), { preIssuePrompt: promptText(before),
        instructions: request.instructions, postIssuePrompt: promptText(after) });
    }
    case RequestKind.COPY: return void await copy(panel.inListOrder(targets), request.what, cx);
    case RequestKind.OPEN: return void (targets[0] && await openPage(targets[0].url));
    case RequestKind.STATUS:
      for (const [stateId, ids] of moves(targets, panel.store.teams, request.name)) await api.update(ids, { stateId });
      return undefined;
    case RequestKind.UPDATE: return void await api.update(targets.map((target) => target.id), request.input);
  }
}

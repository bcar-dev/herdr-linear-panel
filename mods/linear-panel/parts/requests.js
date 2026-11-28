// What the panel does when a popup, a key, a drop or its page asks (channel.js): the work on the issues, with the
// spinner while it runs, the issues read back after a change, and the line that says what failed
import * as api from "../api.js";
import { copy, start } from "../actions.js";
import * as channel from "../channel.js";
import { TOAST_MS } from "../config.js";
import { RequestKind } from "../enums.js";
import { notify } from "herdr";
import { promptText } from "../lib/start.js";
import { moves } from "../lib/teams.js";
import { issuesName, message } from "../lib/text.js";
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

export class Requests {
  /** @type {string | null} what the last change or lookup that failed said, until it is clicked away */
  failed = null;

  /** @param {Panel} panel */
  constructor(panel) {
    this.panel = panel;
    // A request left over from before a restart or reload is not replayed
    this.lastServedAt = channel.pending()?.at ?? 0;
  }

  // The requests the popups left since the last drawing. Served from a drawing, where nothing may be written: a
  // clipboard write waits for a timer
  /** @param {Context} context */
  serveAsked(context) {
    for (const request of channel.requestsAfter(this.lastServedAt)) {
      this.lastServedAt = request.at;
      this.#serve(request, context);
    }
  }

  /**
   * @param {PanelRequest} request
   * @param {Context} context
   */
  #serve(request, context) {
    switch (request.kind) {
      case RequestKind.DISPLAY: return this.panel.redisplay(request.change, context);
      case RequestKind.COMPOSE: return void composeIssue(request.team);
      case RequestKind.CLIPBOARD: {
        const { text, label } = request;
        return context.timer.after(0, (context) => {
          context.write_to_clipboard(text);
          notify({ title: label, timeout: TOAST_MS });
        });
      }
      case RequestKind.COMMENT: return this.#changeComment(request, context);
      default: return this.perform(request, context);
    }
  }

  /**
   * @param {Performed} request
   * @param {Context} context
   * @param {() => void} [undo] runs when the tracker refuses the change
   */
  perform(request, context, undo) {
    const { loader, store, detail } = this.panel, loaded = store.index(), page = detail?.issue;
    const targets = request.ids.flatMap((id) => loaded.get(id) ?? (page?.id === id ? page : []));
    if (!targets.length) return;
    const changes = MUTATES[request.kind];
    // With a page open, the list is out of sight: the change is read back quietly
    const quiet = Boolean(detail);
    if (changes) loader.begin(quiet);
    this.failed = null;
    context.spawn(async (context) => {
      try {
        await this.#carryOut(request, targets, context);
      } catch (error) {
        this.failed = `${issuesName(targets)}: ${message(error)}`;
        undo?.();
      } finally {
        if (changes) {
          loader.end();
          if (quiet) loader.reloadQuietly(context);
          else loader.reload(context);
        }
        context.notify();
      }
    });
  }

  // Work of the page that is not an update (a comment): with the spinner, like a change. `then` runs once it is done
  /**
   * @param {() => Promise<unknown>} task
   * @param {Issue} issue
   * @param {Context} context
   * @param {(context: Context) => void} then
   */
  track(task, issue, context, then) {
    const { loader } = this.panel;
    loader.begin();
    this.failed = null;
    context.spawn(async (context) => {
      try {
        await task();
        then(context);
      } catch (error) {
        this.failed = `${issue.identifier}: ${message(error)}`;
      } finally {
        loader.end();
        loader.unspin(context);
        context.notify();
      }
    });
  }

  // Lets what was asked end on its own: a failure is shown, and asked again the next time it is needed
  /**
   * @param {Promise<unknown> | undefined} pending
   * @param {string} what
   * @param {Context} context
   */
  settle(pending, what, context) {
    if (!pending) return;
    context.spawn(async (context) => {
      try {
        await pending;
      } catch (error) {
        this.failed = `Could not load ${what}: ${message(error)}`;
      }
      context.notify();
    });
  }

  /**
   * @param {Extract<Work, { kind: "comment" }>} request
   * @param {Context} context
   */
  #changeComment({ change, comment, extra }, context) {
    const { detail: page, openers, hints } = this.panel;
    if (!page) return;
    if (change === "confirm-delete") return openers.confirmDelete(page, comment);
    if (change === "start-edit") {
      return context.timer.after(0, (context) => {
        try {
          hints.clear();
          page.comments.startEdit(comment, context);
        } catch (error) {
          this.failed = `${page.issue.identifier}: ${message(error)}`;
          context.notify();
        }
      });
    }
    this.track(() => api.changeComment(change, comment, extra), page.issue, context,
      (context) => page.comments.load(context));
  }

  /**
   * @param {Performed} request
   * @param {Issue[]} targets
   * @param {Context} context
   */
  async #carryOut(request, targets, context) {
    const { panel } = this;
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
      case RequestKind.COPY: return void await copy(panel.inListOrder(targets), request.what, context);
      case RequestKind.OPEN: return void (targets[0] && await openPage(targets[0].url));
      case RequestKind.STATUS:
        for (const [stateId, ids] of moves(targets, panel.store.teams, request.name)) {
          await api.update(ids, { stateId });
        }
        return undefined;
      case RequestKind.UPDATE: return void await api.update(targets.map((target) => target.id), request.input);
    }
  }
}

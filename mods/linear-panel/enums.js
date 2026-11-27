// The closed sets of strings the mod passes around, named once. The values are what is stored, sent and compared:
// they never change. Pure, so node can test the files that use them (tests/unit)

export const CommentChange = Object.freeze({
  DELETE: "delete", EDIT: "edit", RESOLVE: "resolve", UNRESOLVE: "unresolve",
});
/** @typedef {typeof CommentChange[keyof typeof CommentChange]} CommentChange */

export const Completed = Object.freeze({
  ALL: "all", CYCLE: "cycle", DAY: "day", MONTH: "month", NONE: "none", WEEK: "week",
});
/** @typedef {typeof Completed[keyof typeof Completed]} Completed */

export const CopyWhat = Object.freeze({
  BRANCH: "branch", DIFFS: "diffs", EVERYTHING: "everything", ID: "id", LINK: "link", MARKDOWN: "markdown",
  PROMPT: "prompt", TITLE: "title", URL: "url",
});
/** @typedef {typeof CopyWhat[keyof typeof CopyWhat]} CopyWhat */

export const KeyAction = Object.freeze({
  CHOOSE: "choose", COMMANDS: "commands", COMPOSE: "compose", COPY: "copy", DISPLAY: "display", RELOAD: "reload",
  TICK: "tick", UNASSIGN: "unassign", UNTICK: "untick", VIEW: "view",
});
/** @typedef {typeof KeyAction[keyof typeof KeyAction]} KeyAction */

export const Mark = Object.freeze({ ALL: "all", SOME: "some" });
/** @typedef {typeof Mark[keyof typeof Mark]} Mark */

export const Ordering = Object.freeze({ PRIORITY: "priority", STATUS: "status", TITLE: "title" });
/** @typedef {typeof Ordering[keyof typeof Ordering]} Ordering */

export const Platform = Object.freeze({ LINUX: "linux", MAC: "macos", WINDOWS: "windows" });
/** @typedef {typeof Platform[keyof typeof Platform]} Platform */

export const Property = Object.freeze({
  ASSIGN: "assign", CYCLE: "cycle", ESTIMATE: "estimate", PRIORITY: "priority", STATUS: "status",
});
/** @typedef {typeof Property[keyof typeof Property]} Property */

export const Page = Object.freeze({ ...Property, ACTIONS: "actions" });
/** @typedef {typeof Page[keyof typeof Page]} Page */

export const RequestKind = Object.freeze({
  CLIPBOARD: "clipboard", COMMENT: "comment", COMPOSE: "compose", COPY: "copy", DISPLAY: "display", OPEN: "open",
  START: "start", STATUS: "status", UPDATE: "update",
});
/** @typedef {typeof RequestKind[keyof typeof RequestKind]} RequestKind */

export const Side = Object.freeze({ ABOVE: "above", BELOW: "below", RIGHT: "right" });
/** @typedef {typeof Side[keyof typeof Side]} Side */

export const SourceType = Object.freeze({ GITHUB: "github", GITLAB: "gitlab" });
/** @typedef {typeof SourceType[keyof typeof SourceType]} SourceType */

export const StateType = Object.freeze({
  BACKLOG: "backlog", CANCELED: "canceled", COMPLETED: "completed", DUPLICATE: "duplicate", STARTED: "started",
  TRIAGE: "triage", UNSTARTED: "unstarted",
});
/** @typedef {typeof StateType[keyof typeof StateType]} StateType */

export const ViewKey = Object.freeze({ ALL: "all", CYCLE: "cycle" });
/** @typedef {typeof ViewKey[keyof typeof ViewKey]} ViewKey */

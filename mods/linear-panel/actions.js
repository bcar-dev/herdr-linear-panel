// The two things done to an issue that are more than an update: copying it, and starting work on it.
import { appHome, exec, focused, home, notify, panes, readTextFile, run, spaces } from "herdr";
import * as api from "./api.js";
import { copiesFor } from "./config.js";
import { NAME } from "./tracker.js";
import { copyText } from "./lib/copy.js";
import { prompt, slug, startState, worktrees } from "./lib/start.js";

/**
 * @param {Issue[]} issues
 * @param {CopyWhat} what
 * @param {Context} cx
 */
export async function copy(issues, what, cx) {
  /** @type {(id: string) => Promise<IssueDetails>} */
  const read = what === "everything" ? api.details
    : what === "markdown" || what === "prompt" ? async (id) => ({ description: await api.description(id) })
    : async () => ({});
  const details = await Promise.all(issues.map((issue) => read(issue.id)));
  cx.write_to_clipboard(copyText(what, issues, details, NAME));
  // Found: the menu and the key only ask for an entry that is offered for these issues.
  const { label } = /** @type {{ label: string }} */ (copiesFor(issues.length).find((entry) => entry.what === what));
  const copied = issues.length === 1 ? issues[0].identifier : `${issues.length} issues`;
  notify({ title: label.replace("Copy", "Copied"), body: copied, timeout: 2000 });
}

// Where checkouts go: Herdr's own setting, so they sit with the worktrees its shipped mod makes.
async function worktreesFolder() {
  const settings = JSON.parse((await readTextFile(`${appHome()}/settings.json`)) ?? "{}");
  return (settings.worktrees?.directory ?? "~/.herdr/worktrees").replace(/^~(?=\/|$)/, home()).replace(/\/+$/, "");
}

// A checkout of the issue's branch (an existing one is reused), the issue moved to its started state unless it is
// already there or further along, then a space there with the agent on it. `states` are the workflow states of the
// issue's team, `agent` the agent to run and `base` what the person's settings open its first message with.
/**
 * @param {Issue} issue
 * @param {string} text
 * @param {WorkflowState[]} states
 * @param {{ agent: Agent | null, base: string }} with
 */
export async function start(issue, text, states, { agent, base }) {
  if (!agent) throw new Error("No agent to start: install one, or name one in the panel's settings");
  const space = spaces().find((s) => s.active), f = focused();
  // shortcut: this computer only, pass `on: space.machine` and that machine's home when spaces live elsewhere.
  if (space?.machine) throw new Error("Start only works in a space on this computer");
  const cwd = panes().find((p) => p.pane === f?.pane)?.cwd || f?.cwd || space?.folder;
  /** @param {string[]} args */
  const git = (args, timeout = 30_000) => exec("git", args, { cwd, timeout });
  // Checkouts deleted by hand stay registered and would be reused as if they were there: forget them first.
  if (cwd) await git(["worktree", "prune"]);
  const list = cwd ? await git(["worktree", "list", "--porcelain"]) : null;
  if (!list || list.code !== 0) throw new Error("Start needs the focused pane to be in a git repository");
  // Read before anything changes, so a rejected key stops Start early.
  const description = await api.description(issue.id);
  const checkouts = worktrees(list.stdout), branch = issue.branchName;
  let path = checkouts.find((w) => w.branch === branch)?.path;
  if (!path) {
    const repository = checkouts[0].path.split("/").pop();
    path = `${await worktreesFolder()}/${repository}/${slug(branch)}`;
    const exists = (await git(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`])).code === 0;
    const added = await git(exists ? ["worktree", "add", path, branch]
      : ["worktree", "add", "-b", branch, path, "HEAD"], 600_000);
    if (added.code !== 0) throw new Error((added.stderr || added.stdout).trim() || "git worktree add failed");
  }
  const state = startState(issue, states);
  if (state) await api.update([issue.id], { stateId: state.id });
  // Unnamed, like the shipped worktree spaces: the space follows its checkout and nests under its repo.
  const task = prompt(base, text, { ...issue, description }, NAME);
  run("space.new", { folder: path, tab: issue.identifier, argv: agent.run, task });
}

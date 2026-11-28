// The two things done to an issue that are more than an update: copying it, and starting work on it
import { appHome, exec, focused, home, notify, panes, readTextFile, run, spaces } from "herdr";
import * as api from "./api.js";
import { TOAST_MS, copiesFor } from "./config.js";
import { CopyWhat } from "./enums.js";
import { NAME } from "./tracker.js";
import { copyText } from "./lib/copy.js";
import { firstMessage, slug, startState, worktrees } from "./lib/start.js";

const DEFAULT_WORKTREES = "~/.herdr/worktrees";
const GIT_TIMEOUT_MS = 30_000;
const WORKTREE_ADD_TIMEOUT_MS = 600_000;

/**
 * @param {Issue[]} issues
 * @param {CopyWhat} what
 * @param {Context} cx
 */
export async function copy(issues, what, cx) {
  /** @type {(id: string) => Promise<IssueDetails>} */
  const read = what === CopyWhat.EVERYTHING ? api.page
    : what === CopyWhat.MARKDOWN || what === CopyWhat.PROMPT
      ? async (id) => ({ description: await api.description(id) })
      : async () => ({});
  const details = await Promise.all(issues.map((issue) => read(issue.id)));
  const text = copyText(what, issues, details, NAME);
  const copied = issues.length === 1 ? issues[0].identifier : `${issues.length} issues`;
  if (what === CopyWhat.DIFFS && !text) {
    notify({ title: `No diffs to copy · ${copied}`, timeout: TOAST_MS });
    return;
  }
  cx.write_to_clipboard(text);
  const { done } = /** @type {{ done: string }} */ (copiesFor(issues.length)
    .find((entry) => entry.what === what));
  notify({ title: `${done} · ${copied}`, timeout: TOAST_MS });
}

// Windows drives and UNC paths count as absolute too
const ABSOLUTE_PATH = /^([a-z]:)?[\\/]/i;

async function worktreesFolder() {
  const file = `${appHome()}/settings.json`;
  /** @type {{ worktrees?: { directory?: string } }} */
  let settings;
  try {
    settings = JSON.parse((await readTextFile(file)) ?? "{}");
  } catch (error) {
    throw new Error(`Start cannot read ${file}: ${error instanceof Error ? error.message : error}`, { cause: error });
  }
  const directory = (settings.worktrees?.directory ?? DEFAULT_WORKTREES).replace(/^~(?=\/|$)/, home())
    .replace(/\/+$/, "");
  if (!ABSOLUTE_PATH.test(directory)) {
    throw new Error(`worktrees.directory in ${file} must be an absolute path (or start with ~): ${directory}`);
  }
  return directory;
}

/**
 * @param {Issue} issue
 * @param {WorkflowState[]} states
 * @param {Agent | null} agent
 * @param {PromptParts} parts
 */
export async function start(issue, states, agent, parts) {
  if (!agent) throw new Error("No agent to start: install one, or name one in the panel's settings");
  const space = spaces()
      .find((candidate) => candidate.active), pane = focused();
  if (space?.machine) throw new Error("Start only works in a space on this computer");
  const cwd = panes()
    .find((listed) => listed.pane === pane?.pane)?.cwd || pane?.cwd || space?.folder;
  /** @param {string[]} args */
  const git = (args, timeout = GIT_TIMEOUT_MS) => exec("git", args, { cwd, timeout });
  // Checkouts deleted by hand stay registered and would be reused as if they were there: forget them first
  if (cwd) await git(["worktree", "prune"]);
  const list = cwd ? await git(["worktree", "list", "--porcelain"]) : null;
  if (!list || list.code !== 0) throw new Error("Start needs the focused pane to be in a git repository");
  const description = await api.description(issue.id);
  const checkouts = worktrees(list.stdout), branch = issue.branchName;
  let path = checkouts.find((checkout) => checkout.branch === branch)?.path;
  if (!path) {
    // The branch name comes from the tracker, and git reads a leading dash as an option
    if (branch.startsWith("-") || (await git(["check-ref-format", "--branch", branch])).code !== 0) {
      throw new Error(`Start cannot use "${branch}" as a git branch name`);
    }
    const repository = checkouts[0].path.split("/")
      .pop();
    path = `${await worktreesFolder()}/${repository}/${slug(branch)}`;
    const exists = (await git(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`])).code === 0;
    const added = await git(exists ? ["worktree", "add", path, branch]
      : ["worktree", "add", "-b", branch, path, "HEAD"], WORKTREE_ADD_TIMEOUT_MS);
    if (added.code !== 0) throw new Error((added.stderr || added.stdout).trim() || "git worktree add failed");
  }
  const state = startState(issue, states);
  if (state) await api.update([issue.id], { stateId: state.id });
  // Named after the issue, else it takes its checkout's folder, the whole branch. It still nests under its repo, which
  // the folder's git tells, not the name
  const task = firstMessage({ ...issue, description }, NAME, parts);
  run("space.new", { name: issue.identifier, folder: path, tab: issue.identifier, argv: agent.run, task });
}

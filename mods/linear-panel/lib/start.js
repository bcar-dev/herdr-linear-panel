// The rules behind Start: the state an issue moves to, the agent's first message, and where the issue's checkout goes.
// Pure rules with no calls to Herdr, so node can test them (tests/unit).
import { copyText } from "./copy.js";
import { workflow } from "./teams.js";

// The state Start moves an issue to: "In Progress" when the team has one, else its first started state.
// Null when the issue is already there or further along the workflow, so Start never moves it backwards.
/**
 * @param {Issue} issue
 * @param {WorkflowState[]} states
 */
export function startState(issue, states) {
  const flow = workflow(states), started = flow.filter((s) => s.type === "started");
  const target = started.find((s) => s.name.toLowerCase() === "in progress") ?? started[0];
  const now = flow.findIndex((s) => s.id === issue.state.id);
  return target && now >= 0 && now < flow.indexOf(target) ? target : null;
}

// The agent Start runs: the one the settings name by its key in Herdr's table of programs, else the first installed
// of the agents Herdr knows, which it lists most picked first. Null when there is none.
/**
 * @param {Agent[]} agents
 * @param {string | undefined} wanted
 */
export const pickAgent = (agents, wanted) =>
  agents.find((agent) => agent.key === wanted) ?? agents.find((agent) => agent.installed) ?? null;

// The agent's first message: the person's own opening (`base`, from the settings), what they typed for this issue,
// then the issue as "Copy as prompt" gives it. `tracker` is the product's name.
/**
 * @param {string} base
 * @param {string} text
 * @param {Issue & IssueDetails} issue
 * @param {string} tracker
 */
export const prompt = (base, text, issue, tracker) =>
  [base.trim(), text.trim(), copyText("prompt", [issue], [issue], tracker)].filter(Boolean).join("\n\n");

// Folder name of a branch's checkout, as the worktree mod that ships with Herdr names it.
/** @param {string} branch */
export const slug = (branch) => branch.normalize("NFC").replace(/[^\p{L}\p{M}\p{N}._-]+/gu, "-")
  .replace(/^-+|-+$/g, "");

// `git worktree list --porcelain` as { path, branch } entries, the main checkout first.
/** @param {string} porcelain */
export function worktrees(porcelain) {
  return porcelain.split(/\n\n+/).flatMap((block) => {
    const lines = block.split("\n"), path = lines.find((l) => l.startsWith("worktree "))?.slice(9);
    const branch = lines.find((l) => l.startsWith("branch "))?.slice(7).replace(/^refs\/heads\//, "") ?? null;
    return path ? [{ path, branch }] : [];
  });
}

// Sample teams and issues, and a fake tracker that answers the mod's API requests with them.
import { reset } from "./host/herdr.js";
import { mount } from "./host/mount.js";

const state = (id, name, type, position) => ({ id, name, type, position, color: `#${type}` });
const ME = { id: "me", name: "Me Myself", displayName: "me", initials: "MM", avatarBackgroundColor: "#123456" };
const ADA = { id: "ada", name: "Ada Lovelace", displayName: "ada", initials: "AL", avatarBackgroundColor: null };

// Two-week cycles around the time the tests run: 12 is the current one, 11 the previous, 13 and 14 to come.
const WEEK = 7 * 86_400_000, NOW = Date.now();
const cycle = (number, starts) => ({ id: `cycle-${number}`, number, name: null,
  startsAt: new Date(NOW + starts * WEEK).toISOString(), endsAt: new Date(NOW + (starts + 2) * WEEK).toISOString() });
const CYCLES = [cycle(11, -3), cycle(12, -1), cycle(13, 1), cycle(14, 3)];
// The current cycle as an issue in it carries it.
export const CYCLE = {
  ...CYCLES[1], description: "Capacity: 20 pts\nMore below", progress: 0.7, scopeHistory: [8, 10],
};
// The next one, which has no history yet.
export const NEXT = { ...CYCLES[2], description: null, progress: 0, scopeHistory: [] };

// A team that estimates in Fibonacci points and has cycles, and one that does neither.
export const BACK = {
  id: "team-back", key: "BACK", name: "Backend",
  issueEstimationType: "fibonacci", issueEstimationAllowZero: false, issueEstimationExtended: false,
    defaultIssueEstimate: 1,
  states: [
    state("back-backlog", "Backlog", "backlog", 0), state("back-todo", "Todo", "unstarted", 1),
    state("back-doing", "In Progress", "started", 2), state("back-review", "In Review", "started", 3),
    state("back-done", "Done", "completed", 4),
  ],
  members: [ME, ADA],
  cycles: CYCLES,
};
export const WEB = {
  id: "team-web", key: "WEB", name: "Website",
  issueEstimationType: "notUsed", issueEstimationAllowZero: false, issueEstimationExtended: false,
    defaultIssueEstimate: 0,
  states: [state("web-todo", "Todo", "unstarted", 1), state("web-doing", "In Progress", "started", 2),
    state("web-done", "Done", "completed", 3)],
  members: [ME],
  cycles: [],
};

export function issue(identifier, title, team, stateName, more = {}) {
  const id = identifier.toLowerCase();
  return {
    id, identifier, title, url: `https://tracker.test/issue/${identifier}`, priority: 0, estimate: null,
    branchName: `me/${id}`, completedAt: null, canceledAt: null,
    state: team.states.find((s) => s.name === stateName), cycle: null, team: { id: team.id },
    attachments: { nodes: [] }, ...more,
  };
}

// A merge request linked to an issue, as the tracker's attachment holds it. `repo` is "owner/name".
export function mr(sourceType, repo, number, status, more = {}) {
  const [repoLogin, repoName] = repo.split("/");
  const url = sourceType === "gitlab" ? `https://gitlab.com/${repo}/-/merge_requests/${number}`
    : `https://github.com/${repo}/pull/${number}`;
  return { sourceType, metadata: { url, number, title: `Change ${number}`, status, repoLogin, repoName,
    createdAt: "2026-11-24T07:00:00.000Z", mergedAt: status === "merged" ? "2026-11-23T11:00:00.000Z" : null,
    closedAt: status === "closed" ? "2026-11-22T10:00:00.000Z" : null, userLogin: "benjamin.carlier", ...more } };
}

// What the tracker's pull requests answer tells of one: 6 files, +41 -4, approved by koromyslo.
export const detail = (url, more = {}) => ({ url, diffStats: { fileCount: 6, additions: 41, deletions: 4 },
  reviewerStates: [{ lastSubmittedDecision: "approved", reviewer: { displayName: "koromyslo" } }], ...more });

// Three issues in the current cycle (one urgent and open, one urgent and done) and two outside it.
export const sampleIssues = () => [
  issue("BACK-1", "Fix login", BACK, "In Progress", { priority: 1, estimate: 3, cycle: CYCLE }),
  issue("BACK-2", "Add audit log", BACK, "Todo", { priority: 2, cycle: CYCLE }),
  issue("BACK-3", "Old bug", BACK, "Done",
    { priority: 1, estimate: 5, cycle: CYCLE, completedAt: "2026-11-20T09:00:00.000Z" }),
  issue("WEB-7", "Landing page", WEB, "Todo"),
  issue("BACK-10", "Tidy the backlog", BACK, "Backlog", { priority: 4, estimate: 2 }),
];

// A fake tracker: `fetch` and `exec` for the fake app, the `issues` it holds (an update changes them), and what it
// was `asked`, as { kind, variables, url, authorization }. Set `key` to "" for a computer with no API key, `error`
// to make every request fail with that message, `details` for the pull requests it tells of.
export function tracker({ issues = sampleIssues(), teams = [BACK, WEB], myTeams = [BACK, WEB] } = {}) {
  // Set `more` for an API that has more issues than the page it answers.
  const server = { issues, asked: [], key: "test-key", error: null, more: false, history: [], details: [] };
  const page = (nodes) => ({ nodes, pageInfo: { hasNextPage: server.more } });
  const answers = {
    issues: () => ({
      viewer: {
        id: ME.id,
        teams: { nodes: myTeams.map(({ key, name }) => ({ key, name })) },
        cycle: page(server.issues.filter((i) => i.cycle)),
        all: page(server.issues),
      },
    }),
    teams: ({ ids }) => ({
      teams: { nodes: teams.filter((team) => ids.includes(team.id))
        .map((team) => ({ ...team, states: { nodes: team.states }, members: { nodes: team.members },
          cycles: { nodes: team.cycles } })) },
    }),
    description: () => ({ issue: { description: "Steps to reproduce" } }),
    details: () => ({
      issue: { description: "Steps to reproduce",
        comments: { nodes: [{ body: "Seen it too", createdAt: "2026-11-21T10:00:00.000Z", user: { name: "Ada" } }] } },
    }),
    history: () => ({ issue: { stateHistory: { nodes: server.history } } }),
    merges: () => ({ pullRequests: { nodes: server.details } }),
    planned: ({ id }) => ({ cycle: { issues: { nodes: server.issues.filter((i) => i.cycle?.id === id)
      .map(({ estimate, team }) => ({ estimate, team })) } } }),
    update: ({ ids, input }) => {
      for (const found of server.issues.filter((i) => ids.includes(i.id))) {
        const { stateId, ...fields } = input;
        Object.assign(found, fields);
        if (stateId) found.state = teams.flatMap((team) => team.states).find((s) => s.id === stateId);
      }
      return { issueBatchUpdate: { success: true } };
    },
  };
  const kindOf = (query) =>
    query.includes("pullRequests") ? "merges" : query.includes("issueBatchUpdate") ? "update"
      : query.includes("cycle(id") ? "planned"
      : query.includes("viewer") ? "issues" : query.includes("teams(")
      ? "teams" : query.includes("stateHistory") ? "history" : query.includes("comments") ? "details" : "description";
  // The key as each system's shell answers it: cmd echoes the variable's name back when it is not set.
  server.exec = (command) =>
    command === "sh" ? { stdout: server.key } : command === "cmd"
      ? { stdout: `${server.key || "%LINEAR_API_KEY%"}\r\n` } : {};
  server.fetch = async (url, options) => {
    const { query, variables } = JSON.parse(options.body), kind = kindOf(query);
    server.asked.push({ kind, variables, url, authorization: options.headers.Authorization });
    const body = server.error ? { errors: [{ message: server.error }] } : { data: answers[kind](variables) };
    return { ok: !server.error, status: server.error ? 400 : 200, json: async () => body };
  };
  server.kinds = () => server.asked.map((request) => request.kind);
  return server;
}

// The panel's bounds in the window, and a pointer event at a place in it.
export const FRAME = { x: 900, y: 40, width: 400, height: 700 };
export const at = (x, y) =>
  ({ position: { x, y }, local_position: { x: x - FRAME.x, y: y - FRAME.y }, bounds: FRAME, modifiers: {} });

// Gives a turn to the promises that no task tracks: an `open` that falls back to the browser, for one.
export const settled = () => new Promise((resolve) => setImmediate(resolve));

// A fresh fake app with a fake tracker behind it, and the panel started in it. With `load` (the default) the
// panel has drawn once and its first load has ended. `git(args, options)` answers the git commands, `settings` are
// the person's (the props of the panel's block in their layout), `app` overrides the fake app, and the rest goes to
// tracker().
export async function startPanel({ load = true, app = {}, git, settings, ...given } = {}) {
  const server = tracker(given);
  const exec = (command, args, options) => (command === "git" && git ? git(args, options) : server.exec(command));
  reset({ exec, fetch: server.fetch, ...app });
  const panel = mount(settings);
  if (load) {
    panel.draw();
    await panel.cx.idle();
  }
  return { ...panel, server };
}

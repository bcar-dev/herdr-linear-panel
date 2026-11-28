// The tracker's GraphQL API: the queries this mod makes, and nothing about how their answers are shown
import { URL } from "url";
import { CommentChange } from "./enums.js";
import { cleanAnswer } from "./lib/sanitize.js";
import { compareText } from "./lib/text.js";
import { API, NAME, apiKey } from "./tracker.js";

const ANSWER_TIMEOUT_MS = 30_000;
const ATTACHMENTS_PER_ISSUE = 20;
const COMMENTS_PER_PAGE = 100;
const CYCLES_PER_TEAM = 20;
const HISTORY_PER_PAGE = 100;
export const ISSUES_PER_VIEW = 100;
const LABELS_PER_ISSUE = 10;
const LABELS_PER_PAGE = 250;
const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
const MEMBERS_PER_GROUP = 100;
const MERGES_PER_PAGE = 50;
const PLANNED_PER_PAGE = 250;
const PROJECTS_PER_PAGE = 50;
const STATES_PER_TEAM = 50;
const TEAMS_PER_PAGE = 10;
const UNAUTHORIZED = 401;
const UPDATE_IDS_MAX = 50;
const VIEWER_TEAMS = 50;

const ISSUE = `fragment I on Issue {
  id identifier title url priority estimate branchName completedAt canceledAt
  state { id name type color position }
  cycle { id number name description startsAt endsAt progress scopeHistory }
  team { id key name color icon }
  assignee { id name displayName initials avatarBackgroundColor }
  project { id name }
  labels(first: ${LABELS_PER_ISSUE}) { nodes { id name color parent { id } } }
  attachments(first: ${ATTACHMENTS_PER_ISSUE}, filter: { sourceType: { in: ["github", "gitlab"] } }) {
    nodes { sourceType metadata }
  }
}`;

const ISSUES = `query($cycle: IssueFilter, $mine: IssueFilter) {
  viewer {
    id initials avatarBackgroundColor
    teams(first: ${VIEWER_TEAMS}) { nodes { id key name color icon } }
    cycle: assignedIssues(first: ${ISSUES_PER_VIEW}, orderBy: updatedAt, filter: $cycle) {
      nodes { ...I } pageInfo { hasNextPage }
    }
    all: assignedIssues(first: ${ISSUES_PER_VIEW}, orderBy: updatedAt, filter: $mine) {
      nodes { ...I } pageInfo { hasNextPage }
    }
  }
}
${ISSUE}`;

// Explicit page sizes: the API scores a query's complexity by them (for its rate limit), and the defaults (50 x 50)
// exceed the limit of one query
const TEAMS = `query($ids: [ID!], $after: String) {
  teams(first: ${TEAMS_PER_PAGE}, after: $after, filter: { id: { in: $ids } }) {
    nodes {
      id issueEstimationType issueEstimationAllowZero issueEstimationExtended defaultIssueEstimate
      states(first: ${STATES_PER_TEAM}) { nodes { id name type color position } }
      members(first: ${MEMBERS_PER_GROUP}) { nodes { id name displayName initials avatarBackgroundColor } }
      cycles(first: ${CYCLES_PER_TEAM}, filter: { or: [{ isPast: { eq: false } }, { isPrevious: { eq: true } }] }) {
        nodes { id number name startsAt endsAt }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

const COMMENT = "mutation($input: CommentCreateInput!) { commentCreate(input: $input) { success } }";
const COMMENT_DELETE = "mutation($id: String!) { commentDelete(id: $id) { success } }";
const COMMENT_RESOLVE = "mutation($id: String!) { commentResolve(id: $id) { success } }";
const COMMENT_UNRESOLVE = "mutation($id: String!) { commentUnresolve(id: $id) { success } }";
const COMMENT_UPDATE = "mutation($id: String!, $body: String!) { commentUpdate(id: $id, input: { body: $body }) "
  + "{ success } }";
const DESCRIPTION = "query($id: String!) { issue(id: $id) { description } }";
const HISTORY = "query($id: String!, $after: String) { issue(id: $id) { "
  + `stateHistory(first: ${HISTORY_PER_PAGE}, after: $after) { `
  + "nodes { startedAt endedAt state { id name type color position } } pageInfo { hasNextPage endCursor } } } }";
const LABELS = `query($team: ID!, $after: String) { issueLabels(first: ${LABELS_PER_PAGE}, after: $after, `
  + "filter: { or: [{ team: { id: { eq: $team } } }, { team: { null: true } }] }) { "
  + "nodes { id name color isGroup parent { id } team { id } } pageInfo { hasNextPage endCursor } } }";
// The changes and reviewers of the merge requests with these numbers. Undocumented: the tracker's app reads these
// records, which its API answers but its schema hides, so it may change them without notice; a merge request's card
// then goes without them (Store.loadMergeDetails). Asked by numbers and repository names, each alone matching many
// other merge requests; a filter on both repository and number inside `or` answers unrelated ones
const MERGES = `query($numbers: [Float!], $repos: [String!], $after: String) { pullRequests(first: ${MERGES_PER_PAGE}, `
  + "after: $after, filter: { number: { in: $numbers }, repository: { name: { in: $repos } } }) { nodes { "
  + "url diffStats { fileCount additions deletions } reviewerStates { lastSubmittedDecision reviewer { "
  + "... on User { displayName } ... on ExternalUser { displayName } ... on GithubTeam { name } } } } "
  + "pageInfo { hasNextPage endCursor } } }";
const PAGE = `query($id: String!, $after: String) { issue(id: $id) { description comments(first: ${COMMENTS_PER_PAGE}, `
  + "after: $after) { nodes { id body createdAt url resolvedAt parent { id } "
  + "user { id name displayName initials avatarBackgroundColor } botActor { name } } "
  + "pageInfo { hasNextPage endCursor } } } }";
const PLANNED = `query($id: String!, $after: String) { cycle(id: $id) { `
  + `issues(first: ${PLANNED_PER_PAGE}, after: $after, `
  + 'filter: { state: { type: { nin: ["triage", "canceled", "duplicate"] } } }) { nodes { estimate team { id } } '
  + "pageInfo { hasNextPage endCursor } } } }";
const PROJECTS = `query($ids: [ID!], $after: String) { projects(first: ${PROJECTS_PER_PAGE}, after: $after, `
  + "filter: { id: { in: $ids } }) { nodes { id "
  + `members(first: ${MEMBERS_PER_GROUP}) { nodes { id name displayName initials avatarBackgroundColor } } } `
  + "pageInfo { hasNextPage endCursor } } }";
const UPDATE = "mutation($ids: [UUID!]!, $input: IssueUpdateInput!) "
  + "{ issueBatchUpdate(ids: $ids, input: $input) { success } }";

let endpoint = API;
let cachedKey = "";
/** @type {((ms: number) => Promise<void>) | null} */
let wait = null;

// A new panel starts from its own address and asks for the key again. Herdr's fetch never gives up and the mod has no
// timer of its own: the panel lends `pause`, its timer. Without it, a request waits as long as its answer takes
/**
 * @param {string | undefined} address
 * @param {(ms: number) => Promise<void>} [pause]
 */
export const use = (address, pause) => {
  endpoint = address ?? API;
  cachedKey = "";
  wait = pause ?? null;
};

/**
 * The key goes in a header of every request, so it only goes where it is safe: over https, or to a program on this
 * computer
 * @param {string} address
 */
export function checkedEndpoint(address) {
  /** @type {URL | null} */
  let url = null;
  try {
    url = new URL(address);
  } catch {
    // Reported below with the rest
  }
  const local = url?.protocol === "http:" && LOOPBACK_HOSTS.includes(url.hostname);
  if (url?.protocol === "https:" || local) return address;
  throw new Error(`The api setting must be an https address, or an http one on this computer: ${address}`);
}

export class NoKey extends Error {
  constructor() { super("No API key"); }
}

/**
 * Follows a connection's cursor to its last page; `first` is the answer to the first request.
 * @template Node
 * @param {string} query
 * @param {Record<string, unknown>} variables
 * @param {(data: ApiData) => Connection<Node>} connection
 */
async function allNodes(query, variables, connection) {
  /** @type {Node[]} */
  const nodes = [];
  /** @type {ApiData | null} */
  let first = null;
  /** @type {string | null} */
  let after = null;
  do {
    const data = await request(query, after ? { ...variables, after } : variables);
    first ??= data;
    const { nodes: page, pageInfo } = connection(data);
    nodes.push(...page);
    after = pageInfo?.hasNextPage ? pageInfo.endCursor : null;
  } while (after);
  return { first: /** @type {ApiData} */ (first), nodes };
}

/**
 * @param {(ms: number) => Promise<void>} pause
 * @returns {Promise<never>}
 */
async function givenUp(pause) {
  await pause(ANSWER_TIMEOUT_MS);
  throw new Error(`${NAME} did not answer in time`);
}

/**
 * @param {string} query
 * @param {Record<string, unknown>} variables
 * @returns {Promise<ApiData>}
 */
async function request(query, variables) {
  const address = checkedEndpoint(endpoint);
  cachedKey ||= await apiKey();
  if (!cachedKey) throw new NoKey();
  const sent = fetch(address, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: cachedKey },
    body: JSON.stringify({ query, variables }),
  });
  // Given up after the timeout, the answer is ignored when it comes: the host cannot cancel a request
  const response = await (wait ? Promise.race([sent, givenUp(wait)]) : sent);
  if (response.status === UNAUTHORIZED) cachedKey = "";
  // A gateway in front of the API can answer an error page: say which HTTP status, not that the page failed to parse
  /** @type {ApiAnswer | null} */
  let body = null;
  try {
    body = /** @type {ApiAnswer} */ (await response.json());
  } catch {
    // Not JSON: the status below is all there is to say
  }
  const [refusal] = body?.errors ?? [];
  if (refusal) throw new Error(refusal.message);
  if (!body?.data) throw new Error(`${NAME} answered ${response.status} with no data`);
  return cleanAnswer(body.data);
}

/** @param {IssueFilters} filters */
export const issues = async (filters) => (await request(ISSUES, filters)).viewer;

/** @param {string[]} ids */
export async function teams(ids) {
  const { nodes } = await allNodes(TEAMS, { ids }, (data) => data.teams);
  return nodes.map((team) => ({ ...team, states: team.states.nodes, members: team.members.nodes,
    cycles: team.cycles.nodes }));
}

/** @param {string[]} ids */
export async function projectMembers(ids) {
  const { nodes } = await allNodes(PROJECTS, { ids }, (data) => data.projects);
  return Object.fromEntries(nodes.map((project) => [project.id, project.members.nodes]));
}

/** @param {string} id */
export const description = async (id) => (await request(DESCRIPTION, { id })).issue.description;

/** @param {string} id */
export async function page(id) {
  const { first, nodes } = await allNodes(PAGE, { id }, (data) => data.issue.comments);
  return { description: first.issue.description ?? "",
    comments: nodes.sort((earlier, later) => compareText(earlier.createdAt, later.createdAt)) };
}

/** @param {string} team */
export const labels = async (team) => (await allNodes(LABELS, { team }, (data) => data.issueLabels)).nodes;

/**
 * @param {string} issueId
 * @param {string} body
 * @param {string} [parentId]
 */
export async function comment(issueId, body, parentId) {
  const data = await request(COMMENT, { input: { issueId, body, parentId } });
  if (!data.commentCreate.success) throw new Error(`${NAME} refused the comment`);
}

/**
 * @type {Record<CommentChange, {
 *   query: string, field: CommentMutation, variables: (id: string, extra: string) => Record<string, string>
 * }>}
 */
const COMMENT_CHANGES = {
  [CommentChange.EDIT]: { query: COMMENT_UPDATE, field: "commentUpdate", variables: (id, body) => ({ id, body }) },
  [CommentChange.DELETE]: { query: COMMENT_DELETE, field: "commentDelete", variables: (id) => ({ id }) },
  [CommentChange.RESOLVE]: { query: COMMENT_RESOLVE, field: "commentResolve", variables: (id) => ({ id }) },
  [CommentChange.UNRESOLVE]: { query: COMMENT_UNRESOLVE, field: "commentUnresolve", variables: (id) => ({ id }) },
};
/**
 * @param {CommentChange} change
 * @param {string} id the comment
 * @param {string} [extra] the new body of an edit
 */
export async function changeComment(change, id, extra = "") {
  const { query, field, variables } = COMMENT_CHANGES[change];
  const data = await request(query, variables(id, extra));
  if (!data[field]?.success) throw new Error(`${NAME} refused the change`);
}

/** @param {string} id */
export async function stateHistory(id) {
  const { nodes } = await allNodes(HISTORY, { id }, (data) => data.issue.stateHistory);
  return nodes.sort((earlier, later) => compareText(earlier.startedAt, later.startedAt));
}

/** @param {string} id */
export const planned = async (id) => (await allNodes(PLANNED, { id }, (data) => data.cycle.issues)).nodes;

// Reviewers are those who submitted a review. One the tracker tells without its changes is left out, a reviewer it
// cannot name too, so the others still show
/**
 * @param {number[]} numbers
 * @param {string[]} repos
 * @returns {Promise<MergeDetails[]>}
 */
export async function mergeDetails(numbers, repos) {
  const found = (await allNodes(MERGES, { numbers, repos }, (data) => data.pullRequests)).nodes;
  return found.flatMap(({ url, diffStats, reviewerStates }) => (diffStats ? [{
    url, files: diffStats.fileCount, added: diffStats.additions, removed: diffStats.deletions,
    reviewers: reviewerStates.flatMap(({ lastSubmittedDecision, reviewer }) => {
      const name = reviewer?.displayName ?? reviewer?.name;
      return name && lastSubmittedDecision && lastSubmittedDecision !== "pending"
        ? [{ name, approved: lastSubmittedDecision === "approved" }] : [];
    }),
  }] : []));
}

/**
 * @param {string[]} ids
 * @param {IssueUpdate} input
 */
export async function update(ids, input) {
  for (let from = 0; from < ids.length; from += UPDATE_IDS_MAX) {
    const data = await request(UPDATE, { ids: ids.slice(from, from + UPDATE_IDS_MAX), input });
    if (!data.issueBatchUpdate.success) throw new Error(`${NAME} refused the update`);
  }
}

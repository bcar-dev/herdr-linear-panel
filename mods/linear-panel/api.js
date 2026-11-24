// The tracker's GraphQL API: the queries this mod makes, and nothing about how their answers are shown.
import { API, NAME, apiKey } from "./tracker.js";

const ISSUE = `fragment I on Issue {
  id identifier title url priority estimate branchName completedAt canceledAt
  state { id name type color position }
  cycle { id number name description startsAt endsAt progress scopeHistory }
  team { id }
  attachments(first: 20, filter: { sourceType: { in: ["github", "gitlab"] } }) { nodes { sourceType metadata } }
}`;

// The attachments are the issue's merge requests. shortcut: the first 20 an issue, raise it if one ever has more.
// shortcut: first 100 issues per view, paginate with pageInfo.endCursor if a view ever fills up.
// Most recently updated first, so a view cut at 100 keeps the live issues.
const ISSUES = `query($cycle: IssueFilter, $mine: IssueFilter) {
  viewer {
    id
    teams(first: 50) { nodes { key name } }
    cycle: assignedIssues(first: 100, orderBy: updatedAt, filter: $cycle) { nodes { ...I } pageInfo { hasNextPage } }
    all: assignedIssues(first: 100, orderBy: updatedAt, filter: $mine) { nodes { ...I } pageInfo { hasNextPage } }
  }
}
${ISSUE}`;

// Explicit page sizes: the API scores a query's complexity by them (for its rate limit), and the defaults (50 x 50)
// exceed the limit of one query. A team's cycles are those an issue can be moved to: the current one, those to come
// and the previous one.
const TEAMS = `query($ids: [ID!]) {
  teams(first: 10, filter: { id: { in: $ids } }) {
    nodes {
      id issueEstimationType issueEstimationAllowZero issueEstimationExtended defaultIssueEstimate
      states(first: 50) { nodes { id name type color position } }
      members(first: 100) { nodes { id name displayName initials avatarBackgroundColor } }
      cycles(first: 20, filter: { or: [{ isPast: { eq: false } }, { isPrevious: { eq: true } }] }) {
        nodes { id number name startsAt endsAt }
      }
    }
  }
}`;

const DESCRIPTION = "query($id: String!) { issue(id: $id) { description } }";
const DETAILS = "query($id: String!) { issue(id: $id) { description "
  + "comments(first: 50) { nodes { body createdAt user { name } } } } }";
const HISTORY = "query($id: String!) { issue(id: $id) { stateHistory(first: 100) { nodes { "
  + "startedAt endedAt state { id name type color position } } } } }";
// shortcut: the first 250 issues of a cycle, paginate if a team ever plans more.
// The issues a cycle's scope counts: triage, canceled and duplicate ones are left out.
const PLANNED = "query($id: String!) { cycle(id: $id) { issues(first: 250, filter: { state: { type: "
  + '{ nin: ["triage", "canceled", "duplicate"] } } }) { nodes { estimate team { id } } } } }';
// The changes and reviewers of the merge requests with these numbers. Undocumented: the tracker's app reads these
// records, which its API answers but its schema hides, so it may change them without notice; a merge request's card
// then goes without them. Asked by numbers and repository names, each alone matching many other merge requests; a
// filter on both repository and number inside `or` answers unrelated ones. shortcut: the first 50, enough unless
// several of the issue's repositories share several of its numbers.
const MERGES = "query($numbers: [Float!], $repos: [String!]) { pullRequests(first: 50, filter: { "
  + "number: { in: $numbers }, repository: { name: { in: $repos } } }) { nodes { "
  + "url diffStats { fileCount additions deletions } reviewerStates { lastSubmittedDecision reviewer { "
  + "... on User { displayName } ... on ExternalUser { displayName } ... on GithubTeam { name } } } } } }";
const UPDATE = "mutation($ids: [UUID!]!, $input: IssueUpdateInput!) "
  + "{ issueBatchUpdate(ids: $ids, input: $input) { success } }";

// Where requests go: the tracker's API, or the address the person's settings name instead (`api`), a stand-in for
// a demo or a test.
let endpoint = API;
/** @param {string | undefined} address */
export const use = (address) => { endpoint = address ?? API; };

// Thrown when no API key is set up: the panel then shows how to add one.
export class NoKey extends Error {
  constructor() { super("No API key"); }
}

/**
 * @param {string} query
 * @param {Record<string, unknown>} variables
 */
async function request(query, variables) {
  const key = await apiKey();
  if (!key) throw new NoKey();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: key },
    body: JSON.stringify({ query, variables }),
  });
  // A gateway in front of the API can answer an error page: say which HTTP status, not that the page failed to parse.
  /** @type {ApiAnswer | null} */
  let body = null;
  try {
    body = /** @type {ApiAnswer} */ (await response.json());
  } catch {
    // Not JSON: the status below is all there is to say.
  }
  if (body?.errors?.length) throw new Error(body.errors[0].message);
  if (!body?.data) throw new Error(`${NAME} answered ${response.status} with no data`);
  return body.data;
}

// Me, my teams and my issues for the filters { cycle, mine }: { id, teams, cycle, all }, where the views `cycle` and
// `all` are each { nodes, pageInfo }.
/** @param {IssueFilters} filters */
export const issues = async (filters) => (await request(ISSUES, filters)).viewer;

/** @param {string[]} ids */
export async function teams(ids) {
  const found = (await request(TEAMS, { ids })).teams.nodes;
  return found.map((team) => ({ ...team, states: team.states.nodes, members: team.members.nodes,
    cycles: team.cycles.nodes }));
}

/** @param {string} id */
export const description = async (id) => (await request(DESCRIPTION, { id })).issue.description;

// Comments come oldest first.
/** @param {string} id */
export async function details(id) {
  const { issue } = await request(DETAILS, { id });
  return { description: issue.description,
    comments: issue.comments.nodes.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)) };
}

// An issue's stays in each status it has been in, oldest first.
/** @param {string} id */
export async function stateHistory(id) {
  const { issue } = await request(HISTORY, { id });
  return issue.stateHistory.nodes.sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1));
}

// The issues of a cycle, each with its estimate and its team: the points planned in it.
/** @param {string} id */
export const planned = async (id) => (await request(PLANNED, { id })).cycle.issues.nodes;

// What the merge requests with these numbers in these repositories changed, and who reviewed them: those who
// submitted a review. One the tracker tells without its changes is left out, a reviewer it cannot name too, so the
// others still show.
/**
 * @param {number[]} numbers
 * @param {string[]} repos
 * @returns {Promise<MergeDetails[]>}
 */
export async function mergeDetails(numbers, repos) {
  const found = (await request(MERGES, { numbers, repos })).pullRequests.nodes;
  return found.flatMap(({ url, diffStats, reviewerStates }) => (diffStats ? [{
    url, files: diffStats.fileCount, added: diffStats.additions, removed: diffStats.deletions,
    reviewers: reviewerStates.flatMap(({ lastSubmittedDecision, reviewer }) => {
      const name = reviewer?.displayName ?? reviewer?.name;
      return name && lastSubmittedDecision && lastSubmittedDecision !== "pending"
        ? [{ name, approved: lastSubmittedDecision === "approved" }] : [];
    }),
  }] : []));
}

// The same change on every issue, in one request (the API takes up to 50 ids).
/**
 * @param {string[]} ids
 * @param {IssueUpdate} input
 */
export async function update(ids, input) {
  const data = await request(UPDATE, { ids, input });
  if (!data.issueBatchUpdate.success) throw new Error(`${NAME} refused the update`);
}

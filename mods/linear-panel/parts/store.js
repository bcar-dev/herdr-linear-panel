// What the panel knows from the tracker: the issues of each view, the teams, projects and labels (kept between runs),
// and what it asked for on its own account once something was pointed at. The panel asks, and shows
import * as api from "../api.js";
import * as channel from "../channel.js";
import { VIEWS } from "../config.js";
import { keep, recall } from "../lib/cache.js";
import { Asked, Lookups } from "../lib/lookups.js";
import { points } from "../lib/listing.js";
import { merges } from "../lib/merges.js";

const PROJECT_KEY = "project:";

export class Store {
  // What the API answered: the issues of each view and whether a view has more than it loaded
  issues = Object.fromEntries(VIEWS.map(/** @returns {[string, Issue[]]} */ ({ id }) => [id, []]));
  /** @type {Record<string, boolean>} */
  more = {};
  // `me` is my user id
  me = "";
  /** @type {Viewer | undefined} */
  viewer = undefined;
  /** @type {MyTeam[]} */
  myTeams = [];
  // Teams, projects and labels start from what the last run kept, and are asked again once in the background
  /** @type {Map<string, Team>} */
  teams = new Map(recall("teams", []));
  /** @type {Record<string, Member[]>} */
  projects = recall("projects", {});
  /** @type {Map<string, AnyLabel[]>} */
  labels = new Map(recall("labels", []));
  // The description and comments last read of each issue: its page opens with them, then reads again
  /** @type {Map<string, { description: string, comments: PageComment[] }>} */
  pages = new Map();
  /** @type {Asked} the teams, projects and labels of teams asked since this run began */
  asked = new Asked();
  // An issue's stays in each status, once its status mark was pointed at
  /** @type {Lookups<StatusSpan[]>} */
  historyByIssueId = new Lookups();
  // The points planned in a cycle to come, once its row's cycle was pointed at
  /** @type {Lookups<number>} */
  plannedPointsByCycleId = new Lookups();
  // What an issue's merge requests changed and who reviewed them, once its row's merge requests were pointed at
  /** @type {Lookups<MergeDetails[]>} */
  mergeDetailsByIssueId = new Lookups();
  /** @type {Map<string, Issue> | null} */
  #byId = null;

  constructor() {
    channel.shareProjects(this.projects);
  }

  // The loaded issues by id, until the next answer of the API
  index() {
    this.#byId ??= new Map(Object.values(this.issues)
      .flat()
      .map((issue) => [issue.id, issue]));
    return this.#byId;
  }

  /** @param {Viewer} viewer */
  apply(viewer) {
    this.me = viewer.id;
    this.viewer = viewer;
    this.myTeams = viewer.teams.nodes;
    for (const { id: view } of VIEWS) {
      this.issues[view] = viewer[view].nodes;
      this.more[view] = viewer[view].pageInfo.hasNextPage;
    }
    this.#byId = null;
    // What is known of an issue's stays is out of date once its status has changed
    for (const [id, spans] of [...this.historyByIssueId.answers()]) {
      if (spans?.at(-1)?.state?.id !== this.index()
        .get(id)?.state.id) this.historyByIssueId.forget(id);
    }
  }

  /** @param {Issue[]} issues */
  teamsOf(issues) {
    return [...new Set(issues.map((issue) => issue.team.id))].flatMap((id) => this.teams.get(id) ?? []);
  }

  // Whether a team of the loaded issues was never seen: the issues wait for it
  unseenTeams() {
    return [...this.index()
      .values()].some((issue) => !this.teams.has(issue.team.id));
  }

  // A team's states, estimate scale, members and cycles change rarely: they are asked again once a run
  loadTeams() {
    const ids = [...new Set([...this.index()
      .values()].map((issue) => issue.team.id))];
    return this.asked.once(ids, async (fresh) => {
      for (const team of await api.teams(fresh)) this.teams.set(team.id, team);
      keep("teams", [...this.teams]);
    });
  }

  loadProjects() {
    const ids = [...new Set([...this.index()
      .values()].flatMap((issue) => (issue.project ? [issue.project.id] : [])))];
    return this.asked.once(ids.map((id) => `${PROJECT_KEY}${id}`), async (fresh) => {
      Object.assign(this.projects, await api.projectMembers(fresh.map((key) => key.slice(PROJECT_KEY.length))));
      keep("projects", this.projects);
      channel.shareProjects({ ...this.projects });
    });
  }

  /** @param {string} team */
  loadLabels(team) {
    return this.asked.once([`labels:${team}`], async () => {
      this.labels.set(team, await api.labels(team));
      keep("labels", [...this.labels]);
    });
  }

  /** @param {Issue} issue */
  loadStatusHistory(issue) {
    return this.historyByIssueId.ask(issue.id, () => api.stateHistory(issue.id));
  }

  // Asked again after a load (`since`), since issues come and go; meanwhile the tooltip keeps the last answer
  /**
   * @param {Cycle} cycle
   * @param {number} since
   */
  loadPlannedPoints(cycle, since) {
    return this.plannedPointsByCycleId.ask(cycle.id,
      async () => points(await api.planned(cycle.id), this.teams), since);
  }

  /**
   * @param {Issue} issue
   * @param {number} since
   */
  loadMergeDetails(issue, since) {
    const list = merges(issue), urls = new Set(list.map((merge) => merge.url));
    return this.mergeDetailsByIssueId.ask(issue.id, async () => {
      const found = await api.mergeDetails(list.map((merge) => merge.number),
        [...new Set(list.map((merge) => merge.repoName))]);
      return found.filter((details) => urls.has(details.url));
    }, since);
  }
}

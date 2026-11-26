import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { byTitle, completedNote, filters, groups, isFinished, points } from "../../mods/linear-panel/lib/listing.js";

const state = (name, type, position) => ({ id: name, name, type, position });
const backlog = state("Backlog", "backlog", 0), todo = state("Todo", "unstarted", 1),
  doing = state("In Progress", "started", 2);
const review = state("In Review", "started", 3), done = state("Done", "completed", 4);
const issue = (identifier, priority, status, title = identifier) => ({ identifier, priority, state: status, title });
const names = (list) => list.map((group) => group.state.name);
const ids = (list) => list.map((group) => group.issues.map((issue) => issue.identifier));

describe("byTitle", () => {
  it("ignores case and puts spaces, punctuation, digits, then letters", () => {
    const titles = [
      "[Cron] deal-manager bump: Timeout", "Start processing", "refuse quietly", "[Cron] acquirer process: Timeout",
      "Refuse an order item", "10-[Execution] Track", "[cron] a",
    ];
    assert.deepEqual(titles.sort(byTitle), [
      "[cron] a", "[Cron] acquirer process: Timeout", "[Cron] deal-manager bump: Timeout", "10-[Execution] Track",
      "Refuse an order item", "refuse quietly", "Start processing",
    ]);
  });

  it("puts a title before the longer one it starts", () => {
    assert.ok(byTitle("Fix", "Fix login") < 0);
    assert.equal(byTitle("Fix", "fix"), 0);
  });
});

describe("groups", () => {
  const sample = [
    issue("BACK-10", 0, todo, "b"), issue("BACK-9", 3, doing, "Zeta"), issue("BACK-2", 1, todo, "A"),
    issue("BACK-7", 2, review), issue("BACK-100", 3, doing, "alpha"),
  ];

  it("lists the groups in progress first, and by default the most urgent issue first", () => {
    const grouped = groups(sample);
    assert.deepEqual(names(grouped), ["In Review", "In Progress", "Todo"]);
    assert.deepEqual(ids(grouped), [["BACK-7"], ["BACK-9", "BACK-100"], ["BACK-2", "BACK-10"]]);
  });

  it("puts finished groups after the open ones, and an unknown ordering falls back to priority", () => {
    const more = [...sample, issue("BACK-1", 2, done), issue("BACK-3", 4, backlog)];
    assert.deepEqual(names(groups(more, { by: "nonsense" })), ["In Review", "In Progress", "Todo", "Backlog", "Done"]);
  });

  it("orders by title inside the groups", () => {
    assert.deepEqual(ids(groups(sample, { by: "title" })), [["BACK-7"], ["BACK-100", "BACK-9"], ["BACK-2", "BACK-10"]]);
  });

  it("reverses the order inside the groups and leaves the groups where they are", () => {
    const reversed = groups(sample, { by: "priority", reversed: true });
    assert.deepEqual(names(reversed), ["In Review", "In Progress", "Todo"]);
    assert.deepEqual(ids(reversed), [["BACK-7"], ["BACK-100", "BACK-9"], ["BACK-10", "BACK-2"]]);
  });

  it("reverses the groups when ordered by status and leaves the issues where they are", () => {
    const reversed = groups(sample, { by: "status", reversed: true });
    assert.deepEqual(names(reversed), ["Todo", "In Progress", "In Review"]);
    assert.deepEqual(ids(reversed), [["BACK-2", "BACK-10"], ["BACK-9", "BACK-100"], ["BACK-7"]]);
  });

  it("with recency, lists a finished group's latest first whatever the order asked", () => {
    const finished = (identifier, completedAt, title) => ({ ...issue(identifier, 3, done, title), completedAt });
    const mixed = [
      finished("BACK-1", "2026-11-18T09:00:00.000Z", "a"), finished("BACK-2", "2026-11-20T09:00:00.000Z", "b"),
      finished("BACK-3", "2026-11-19T09:00:00.000Z", "c"), issue("BACK-5", 3, todo, "z"), issue("BACK-4", 3, todo, "y"),
    ];
    assert.deepEqual(ids(groups(mixed, { by: "title", recency: true })),
      [["BACK-4", "BACK-5"], ["BACK-2", "BACK-3", "BACK-1"]]);
    assert.deepEqual(ids(groups(mixed, { by: "title", reversed: true, recency: true })),
      [["BACK-5", "BACK-4"], ["BACK-2", "BACK-3", "BACK-1"]]);
    assert.deepEqual(ids(groups(mixed, { by: "title" })), [["BACK-4", "BACK-5"], ["BACK-1", "BACK-2", "BACK-3"]]);
  });
});

describe("filters", () => {
  const now = Date.parse("2026-11-22T12:00:00.000Z");
  const unfinished = { state: { type: { nin: ["completed", "canceled", "duplicate"] } } };
  const inCycle = { cycle: { isActive: { eq: true } } };

  it("lets every issue through when all completed issues show", () => {
    assert.deepEqual(filters("all", now), { cycle: inCycle, mine: null });
  });

  it("keeps only unfinished issues when none show", () => {
    assert.deepEqual(filters("none", now), { cycle: { and: [inCycle, unfinished] }, mine: unfinished });
  });

  it("keeps the finished issues of the active cycle", () => {
    assert.deepEqual(filters("cycle", now).mine, { or: [unfinished, inCycle] });
  });

  it("keeps the issues finished since a day, a week or a month ago", () => {
    const since = (date) => ({ or: [unfinished, { completedAt: { gte: date } }, { canceledAt: { gte: date } }] });
    assert.deepEqual(filters("day", now).mine, since("2026-11-21T12:00:00.000Z"));
    assert.deepEqual(filters("week", now).mine, since("2026-11-15T12:00:00.000Z"));
    assert.deepEqual(filters("month", now).mine, since("2026-10-23T12:00:00.000Z"));
    assert.deepEqual(filters("day", now).cycle, { and: [inCycle, since("2026-11-21T12:00:00.000Z")] });
  });
});

describe("completedNote", () => {
  it("says which completed issues show, for the three choices that have a wording, and their order", () => {
    assert.equal(completedNote("cycle", true), "Showing issues completed during the current cycle · Recent first");
    assert.equal(completedNote("week", false), "Showing issues completed in the past week");
    assert.equal(completedNote("month", true), "Showing issues completed in the past month · Recent first");
    assert.equal(completedNote("all", true), "Recent first");
    assert.equal(completedNote("day", false), "");
  });
});

describe("points", () => {
  it("counts an issue without an estimate for its team's default", () => {
    const teams = new Map([["back", { defaultIssueEstimate: 1 }], ["front", { defaultIssueEstimate: 0 }]]);
    const sized = (team, estimate) => ({ team: { id: team }, estimate });
    assert.equal(points([sized("back", 8), sized("back", null), sized("front", null), sized("front", 2),
      sized("gone", null)], teams), 11);
  });
});

describe("isFinished", () => {
  it("is true of completed, canceled and duplicate issues", () => {
    assert.deepEqual(["completed", "canceled", "duplicate", "started", "backlog"]
      .map((type) => isFinished({ state: { type } })), [true, true, true, false, false]);
  });
});

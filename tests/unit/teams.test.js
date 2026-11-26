import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { changeable, commonEstimates, commonMembers, commonStates, estimateLabel, estimateText, estimates, moves, share,
  statusIcon, workflow } from "../../mods/linear-panel/lib/teams.js";

const state = (name, type, position) => ({ id: name, name, type, position });

describe("workflow", () => {
  it("orders states as the workflow runs, by type then by position", () => {
    const states = [
      state("Duplicate", "duplicate", 9), state("Done", "completed", 4), state("In Review", "started", 3),
      state("Todo", "unstarted", 1),
      state("In Progress", "started", 2), state("Backlog", "backlog", 0), state("On Hold", "started", 1.5),
    ];
    assert.deepEqual(workflow(states)
      .map((status) => status.name),
    ["Backlog", "Todo", "On Hold", "In Progress", "In Review", "Done", "Duplicate"]);
  });
});

describe("statusIcon", () => {
  const started = (count) => Array.from({ length: count }, (_, i) => state(`Step ${i + 1}`, "started", i));
  const pies = (states) => states.map((status) => statusIcon(status, [...states].reverse()));

  it("has one icon per type, and the plain circle for a type it does not know", () => {
    const types = ["triage", "backlog", "unstarted", "completed", "canceled", "duplicate", "novel"];
    assert.deepEqual(types.map((type) => statusIcon({ type })), [
      "status-triage", "status-backlog", "status-unstarted", "status-completed", "status-canceled", "status-duplicate",
      "status-unstarted",
    ]);
  });

  it("fills half the pie of the only started state, half then three quarters of two", () => {
    assert.deepEqual(pies(started(1)), ["status-started-4"]);
    assert.deepEqual(pies(started(2)), ["status-started-4", "status-started-6"]);
  });

  it("fills the pies of more started states in even steps, to the nearest eighth", () => {
    assert.deepEqual(pies(started(3)), ["status-started-2", "status-started-4", "status-started-6"]);
    assert.deepEqual(pies(started(4)),
      ["status-started-2", "status-started-3", "status-started-5", "status-started-6"]);
  });

  it("fills half the pie when the team's states are not known", () => {
    assert.equal(statusIcon(state("In Progress", "started", 2)), "status-started-4");
  });
});

describe("estimates", () => {
  it("offers the team's scale, with zero and the extended values when the team allows them", () => {
    assert.deepEqual(estimates({ issueEstimationType: "fibonacci", issueEstimationAllowZero: true,
      issueEstimationExtended: true }), [0, 1, 2, 3, 5, 8, 13, 21]);
    assert.deepEqual(estimates({ issueEstimationType: "exponential" }), [1, 2, 4, 8, 16]);
  });

  it("offers nothing when the team does not estimate or is unknown", () => {
    assert.deepEqual(estimates({ issueEstimationType: "notUsed" }), []);
    assert.deepEqual(estimates(undefined), []);
  });
});

describe("estimateLabel", () => {
  it("words a T-shirt estimate as its size and any other as its number", () => {
    assert.equal(estimateLabel({ issueEstimationType: "tShirt" }, 5), "L");
    assert.equal(estimateLabel({ issueEstimationType: "fibonacci" }, 5), "5");
    assert.equal(estimateLabel({ issueEstimationType: "fibonacci" }, 0), "0");
  });

  it("is null for no estimate", () => {
    assert.equal(estimateLabel({ issueEstimationType: "fibonacci" }, null), null);
    assert.equal(estimateLabel(undefined, undefined), null);
  });
});

describe("what several teams have in common", () => {
  const backend = {
    states: [state("Done", "completed", 3), state("Todo", "unstarted", 1), state("In QA", "started", 2)],
    members: [{ id: "u2", name: "zoe" }, { id: "u1", name: "Adam" }, { id: "u3", name: "Bob" }],
  };
  const frontend = {
    states: [state("Todo", "unstarted", 5), state("Done", "completed", 9), state("Design", "started", 6)],
    members: [{ id: "u1", name: "Adam" }, { id: "u2", name: "zoe" }],
  };

  it("keeps the statuses every team has, by name, in the first team's workflow order", () => {
    assert.deepEqual(commonStates([backend, frontend])
      .map((status) => status.name), ["Todo", "Done"]);
    assert.deepEqual(commonStates([backend])
      .map((status) => status.name), ["Todo", "In QA", "Done"]);
    assert.deepEqual(commonStates([]), []);
  });

  it("keeps the members of every team, ordered by username", () => {
    assert.deepEqual(commonMembers([backend, frontend])
      .map((member) => member.name), ["Adam", "zoe"]);
    assert.deepEqual(commonMembers([backend])
      .map((member) => member.name), ["Adam", "Bob", "zoe"]);
    const named = { members: [{ id: "a", name: "Zed Young", displayName: "al" },
      { id: "b", name: "Amy Adams", displayName: "zoe" }] };
    assert.deepEqual(commonMembers([named])
      .map((member) => member.displayName), ["al", "zoe"]);
  });

  it("keeps the estimates every scale offers", () => {
    const fibonacci = { issueEstimationType: "fibonacci", issueEstimationExtended: true };
    assert.deepEqual(commonEstimates([fibonacci,
      { issueEstimationType: "exponential", issueEstimationAllowZero: true }]), [1, 2, 8]);
    assert.deepEqual(commonEstimates([{ issueEstimationType: "fibonacci" }]), [1, 2, 3, 5, 8]);
    assert.deepEqual(commonEstimates([{ issueEstimationType: "fibonacci" }, { issueEstimationType: "notUsed" }]), []);
    assert.deepEqual(commonEstimates([]), []);
  });
});

describe("changeable", () => {
  const members = [{ id: "u1", name: "Adam" }];
  const estimating = { issueEstimationType: "fibonacci", states: [state("Todo", "unstarted", 1)], members };
  const plain = { issueEstimationType: "notUsed", states: [state("Todo", "unstarted", 1)], members };

  it("lists what the issues of these teams can be given together", () => {
    assert.deepEqual(changeable([estimating]), ["status", "priority", "assign", "estimate"]);
    assert.deepEqual(changeable([estimating, plain]), ["status", "priority", "assign"]);
    assert.deepEqual(changeable([plain,
      { ...plain, states: [state("Doing", "started", 2)], members: [{ id: "u9", name: "Zed" }] }]), ["priority"]);
  });

  it("offers a cycle to the issues of one team with cycles only: a cycle belongs to its team", () => {
    const cycling = { ...plain, cycles: [{ id: "c1" }] };
    assert.deepEqual(changeable([cycling]), ["status", "priority", "assign", "cycle"]);
    assert.deepEqual(changeable([cycling, { ...cycling, cycles: [{ id: "c2" }] }]), ["status", "priority", "assign"]);
  });

  it("leaves only the priority when no team is known", () => {
    assert.deepEqual(changeable([]), ["priority"]);
  });
});

describe("share", () => {
  it("says whether all, some or none of the values are that one", () => {
    assert.equal(share([2, 2, 2], 2), "all");
    assert.equal(share([2, 0, 2], 2), "some");
    assert.equal(share([1, 0], 2), null);
    assert.equal(share([null, null], null), "all");
  });
});

describe("moves", () => {
  const teams = new Map([
    ["back", { states: [{ id: "back-todo", name: "Todo" }, { id: "back-doing", name: "In Progress" }] }],
    ["front", { states: [{ id: "front-todo", name: "Todo" }, { id: "front-doing", name: "In Progress" }] }],
    ["design", { states: [{ id: "design-todo", name: "Todo" }] }],
  ]);
  const issue = (id, team, stateId) => ({ id, team: { id: team }, state: { id: stateId } });

  it("sends each issue to its own team's status of that name", () => {
    const issues = [
      issue("a", "back", "back-todo"), issue("b", "front", "front-todo"), issue("c", "back", "back-todo"),
      issue("d", "back", "back-doing"), issue("e", "design", "design-todo"), issue("f", "gone", "x"),
    ];
    assert.deepEqual(moves(issues, teams, "In Progress"), [["back-doing", ["a", "c"]], ["front-doing", ["b"]]]);
  });

  it("leaves an issue that is already there", () => {
    assert.deepEqual(moves([issue("d", "back", "back-doing")], teams, "In Progress"), []);
  });
});

describe("estimateText", () => {
  const fibonacci = { issueEstimationType: "fibonacci" }, shirts = { issueEstimationType: "tShirt" };

  it("words a number of points as a picker and a property line do, one point in the singular", () => {
    assert.deepEqual([0, 1, 3, 21].map((value) => estimateText(fibonacci, value)),
      ["0 Points", "1 Point", "3 Points", "21 Points"]);
  });

  it("words no estimate, and a T-shirt size as it is", () => {
    assert.equal(estimateText(fibonacci, null), "No estimate");
    assert.equal(estimateText(shirts, 3), "M");
  });
});

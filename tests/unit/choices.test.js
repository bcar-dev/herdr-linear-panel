import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceRows } from "../../mods/linear-panel/lib/choices.js";
import { BACK, sampleIssues } from "../fixtures.js";

const [fixLogin, auditLog] = sampleIssues();
const ADA = { id: "ada", name: "Ada", displayName: "ada", initials: "A", avatarBackgroundColor: null };
const ME = { id: "me", name: "Me", displayName: "me", initials: "M", avatarBackgroundColor: null };
const NOW = Date.now();
const rows = (page, targets = [fixLogin, auditLog], more = {}) =>
  choiceRows(page, { targets, teams: [BACK], myId: "me", projectMembers: [], now: NOW, ...more });

describe("choiceRows, status", () => {
  it("lists the team's statuses in workflow order, the first nine by digit, and what the issues hold", () => {
    const list = rows("status");
    assert.deepEqual(list.map((row) => [row.label, row.key]),
      [["Backlog", "1"], ["Todo", "2"], ["In Progress", "3"], ["In Review", "4"], ["Done", "5"]]);
    // Both issues hold no status of the same name: one is in progress, the other todo
    assert.deepEqual(list.map((row) => row.mark), [null, "some", "some", null, null]);
    assert.deepEqual(list[2].ask, { kind: "status", name: "In Progress" });
  });
});

describe("choiceRows, priority and estimate", () => {
  it("lists the priorities by their number, and asks for the priority picked", () => {
    const list = rows("priority");
    assert.deepEqual(list.map((row) => [row.label, row.key]), [["No priority", "0"], ["Urgent", "1"], ["High", "2"],
      ["Medium", "3"], ["Low", "4"]]);
    assert.deepEqual(list[1].ask, { kind: "update", input: { priority: 1 } });
    assert.deepEqual(list.map((row) => row.mark), [null, "some", "some", null, null]);
  });

  it("lists no estimate and the scale's, worded as points", () => {
    const list = rows("estimate");
    assert.deepEqual(list.map((row) => row.label), ["No estimate", "1 Point", "2 Points", "3 Points", "5 Points",
      "8 Points"]);
    assert.deepEqual(list[0].ask, { kind: "update", input: { estimate: null } });
  });
});

describe("choiceRows, assignee", () => {
  it("lists nobody first, then me and the assignee, in blocks, and what the issues hold", () => {
    const assigned = [{ ...fixLogin, assignee: ADA }];
    const list = rows("assign", assigned);
    assert.deepEqual(list.map((row) => [row.label, row.group]), [["No assignee", 0], ["me", 0], ["ada", 0]]);
    assert.equal(list[0].key, "0");
    assert.deepEqual(list.map((row) => row.mark), [null, null, "all"]);
    assert.deepEqual(list[2].ask, { kind: "update", input: { assigneeId: "ada" } });
    assert.equal(list[2].words, "Ada ada");
  });

  it("lists the project's members in their own block when the issues share a project", () => {
    const team = { ...BACK, members: [ME, ADA, { ...ADA, id: "bob", name: "Bob", displayName: "bob" }] };
    const list = rows("assign", [fixLogin], { teams: [team], projectMembers: [ADA] });
    assert.deepEqual(list.map((row) => [row.label, row.group]),
      [["No assignee", 0], ["me", 0], ["ada", 1], ["bob", 2]]);
  });
});

describe("choiceRows, cycle", () => {
  it("lists No cycle, the current and the cycles to come, and the previous one apart, under a rule", () => {
    const list = rows("cycle");
    assert.deepEqual(list.map((row) => row.label.split(" ")
      .slice(0, 2)
      .join(" ")),
    ["No cycle", "Cycle 12", "Cycle 13", "Cycle 14", "Cycle 11"]);
    assert.deepEqual(list.map((row) => row.group), [0, 0, 0, 0, 1]);
    assert.equal(list[0].key, "0");
    assert.match(list[1].note, /Current$/);
    assert.deepEqual(list.map((row) => row.mark), [null, "all", null, null, null]);
    assert.deepEqual(list[2].ask, { kind: "update", input: { cycleId: "cycle-13" } });
  });

  it("finds a cycle by its name, its days and where it stands", () => {
    assert.match(rows("cycle")[1].words, /Cycle 12 .*Current/);
  });
});

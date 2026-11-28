import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { blocks, childrenOf, frequent, groupOf, matching,
  wornRows } from "../../mods/linear-panel/lib/labels.js";

const label = (id, name, more = {}) => ({ id, name, color: "#fff", isGroup: false, parent: null, team: null, ...more });
const ALL = [label("a", "OKR Tech"), label("g", "Ticket type", { isGroup: true, team: { id: "t" } }),
  label("s", "Spec", { parent: { id: "g" }, team: { id: "t" } }), label("b", "Repo", { team: { id: "t" } })];
const worn = (...ids) => ({ labels: { nodes: ids.map((id) => ({ id })) } });

describe("labels", () => {
  it("lists as frequent the labels worn on more than one issue, most worn first", () => {
    assert.deepEqual(frequent([worn("a", "b"), worn("a", "b"), worn("b"), worn("s")], ALL), ["b", "a"]);
    assert.deepEqual(frequent([worn("a")], ALL), []);
  });

  it("finds the wearable labels whose name has the query, groups left out", () => {
    assert.deepEqual(matching(ALL, " ty ")
      .map(({ id }) => id), []);
    assert.deepEqual(matching(ALL, "SP")
      .map(({ id }) => id), ["s"]);
  });

  it("names the group of a label", () => {
    assert.equal(groupOf(ALL[2], ALL), "Ticket type");
    assert.equal(groupOf(ALL[0], ALL), "");
  });

  it("lists the frequent labels, then the team's and the workspace's, groups included, grouped labels left out",
    () => {
      assert.deepEqual(blocks(ALL, ["a"])
        .map(({ title, labels }) => [title, labels.map(({ id }) => id)]),
      [["Frequently used", ["a"]], ["Team labels", ["g", "b"]], ["Workspace labels", ["a"]]]);
    });
});

describe("wornRows", () => {
  const all = [label("g", "Cycle drift cause", { isGroup: true, team: { id: "t" } }),
    label("late", "Late discovery", { parent: { id: "g" } }), label("sec", "Security"), label("bg", "Background task",
      { parent: { id: "g" } })];

  it("lists a label of a group as its group, holding the label, and any other label as itself", () => {
    const rows = wornRows(all, ["late", "sec"]);
    assert.deepEqual(rows.map(({ label, child }) => [label.id, child?.id ?? null]), [["g", "late"], ["sec", null]]);
  });

  it("lists a group once, and leaves out a label it does not know", () => {
    assert.deepEqual(wornRows(all, ["late", "bg", "missing"])
      .map(({ label }) => label.id), ["g"]);
  });
});

describe("the order of the labels", () => {
  const named = (name, more = {}) => label(name, name, { team: { id: "t" }, ...more });
  const sub = (name) => label(name, name, { parent: { id: "Repo" } });
  const mixed = [named("incident"), named("Repo", { isGroup: true }), named("EPIC"),
    named("Flow Alerts", { isGroup: true }), named("Legal"), named("Ticket type", { isGroup: true }), named("Data"),
    sub("Sub estimation"), sub("Background task"), sub("client urgence")];

  it("lists the groups first, then the other labels, each alphabetically whatever the case", () => {
    const [team] = blocks(mixed, [])
      .map(({ labels }) => labels.map(({ name }) => name));
    assert.deepEqual(team, ["Flow Alerts", "Repo", "Ticket type", "Data", "EPIC", "incident", "Legal"]);
  });

  it("lists the labels of a group alphabetically", () => {
    assert.deepEqual(childrenOf(mixed, "Repo")
      .map(({ name }) => name),
    ["Background task", "client urgence", "Sub estimation"]);
  });
});

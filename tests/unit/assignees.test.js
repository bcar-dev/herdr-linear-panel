import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assigneeRows } from "../../mods/linear-panel/lib/assignees.js";

const person = (id) => ({ id, name: id, displayName: id, initials: id[0], avatarBackgroundColor: null });
const [ada, bob, cy, di] = ["ada", "bob", "cy", "di"].map(person);
const TEAM = { members: [ada, bob, cy, di] };
const ids = (rows) => rows.map(({ member, group }) => [member?.id ?? null, group]);

describe("assigneeRows", () => {
  it("lists nobody, me and the assignee if not me, then the project's members, then the team's, each once", () => {
    const rows = assigneeRows([{ assignee: bob }], [TEAM], [cy, bob], "ada");
    assert.deepEqual(ids(rows), [[null, 0], ["ada", 0], ["bob", 0], ["cy", 1], ["di", 2]]);
  });

  it("has no project block for an issue outside a project, and only nobody when it has no assignee", () => {
    assert.deepEqual(ids(assigneeRows([{ assignee: null }], [TEAM], [], "bob")),
      [[null, 0], ["bob", 0], ["ada", 2], ["cy", 2], ["di", 2]]);
  });

  it("lists me, then each of several issues' assignees once, in the first block", () => {
    const rows = assigneeRows([{ assignee: ada }, { assignee: bob }, { assignee: ada }], [TEAM], [], "di");
    assert.deepEqual(ids(rows)
      .slice(0, 4), [[null, 0], ["di", 0], ["ada", 0], ["bob", 0]]);
  });
});

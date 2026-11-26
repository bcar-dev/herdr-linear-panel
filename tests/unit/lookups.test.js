import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Asked, Lookups, PENDING } from "../../mods/linear-panel/lib/lookups.js";

describe("Asked", () => {
  it("fetches each key once, and answers nothing when every key was asked", async () => {
    const asked = new Asked(), seen = [];
    const fetch = async (fresh) => { seen.push(fresh); return "done"; };
    assert.equal(await asked.once(["a", "b", "a"], fetch), "done");
    assert.equal(await asked.once(["a", "c"], fetch), "done");
    assert.equal(asked.once(["a", "b", "c"], fetch), undefined);
    assert.deepEqual(seen, [["a", "b"], ["c"]]);
  });

  it("forgets the keys of a fetch that fails, and passes the failure on", async () => {
    const asked = new Asked();
    await assert.rejects(asked.once(["a"], async () => { throw new Error("Offline"); }), /Offline/);
    assert.equal(await asked.once(["a"], async () => "again"), "again");
  });
});

describe("Lookups", () => {
  it("answers PENDING while the first answer is awaited, then the answer", async () => {
    const lookups = new Lookups();
    assert.equal(lookups.get("a"), undefined);
    const pending = lookups.ask("a", async () => 3);
    assert.equal(lookups.get("a"), PENDING);
    await pending;
    assert.equal(lookups.get("a"), 3);
    assert.equal(lookups.ask("a", async () => 4), undefined);
  });

  it("asks again once the answer is older than `since`, and keeps the old answer meanwhile", async () => {
    const lookups = new Lookups();
    await lookups.ask("a", async () => 3);
    const again = lookups.ask("a", async () => 4, Date.now() + 1);
    assert.equal(lookups.get("a"), 3);
    await again;
    assert.equal(lookups.get("a"), 4);
  });

  it("forgets an id whose fetch failed, so the next need asks again", async () => {
    const lookups = new Lookups();
    await assert.rejects(lookups.ask("a", async () => { throw new Error("Offline"); }), /Offline/);
    assert.equal(lookups.get("a"), undefined);
    await lookups.ask("a", async () => 5);
    assert.equal(lookups.get("a"), 5);
  });
});

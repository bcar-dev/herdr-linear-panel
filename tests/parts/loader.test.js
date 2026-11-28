import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NoKey } from "../../mods/linear-panel/api.js";
import { Loader } from "../../mods/linear-panel/parts/loader.js";
import { fakeContext } from "../host/mount.js";

// A loader whose loads wait until `finish(failure)` ends the oldest one still running
function loader() {
  const context = fakeContext(), running = [];
  let loads = 0;
  const subject = new Loader(() => {
    loads++;
    return new Promise((resolve, reject) => running.push((failure) => (failure ? reject(failure) : resolve())));
  });
  const finish = async (failure) => {
    running.shift()(failure);
    await context.idle();
  };
  return { subject, context, finish, loads: () => loads };
}

describe("the loader", () => {
  it("runs one load at a time, and a load asked meanwhile once, after it", async () => {
    const { subject, context, finish, loads } = loader();
    subject.reload(context);
    subject.reloadQuietly(context);
    subject.reloadQuietly(context);
    assert.equal(loads(), 1);
    await finish();
    assert.equal(loads(), 2);
    await finish();
    assert.equal(loads(), 2);
    assert.ok(!subject.loading);
  });

  it("keeps the spinner a moment after a quick load, and shows none for a quiet one", async () => {
    const { subject, context, finish } = loader();
    subject.reload(context);
    await finish();
    assert.ok(subject.spinning);
    context.elapse();
    assert.ok(!subject.spinning);
    subject.reloadQuietly(context);
    assert.ok(!subject.spinning);
    await finish();
  });

  it("keeps the spinner of a change while a quiet load ends, and stops it once the change ends", async () => {
    const { subject, context, finish } = loader();
    subject.begin();
    subject.reloadQuietly(context);
    await finish();
    context.elapse();
    assert.ok(subject.spinning);
    subject.end();
    subject.unspin(context);
    context.elapse();
    assert.ok(!subject.spinning);
  });

  it("tells a missing key from an error, and forgets both once a load goes well", async () => {
    const { subject, context, finish } = loader();
    subject.reloadQuietly(context);
    await finish(new NoKey());
    assert.deepEqual([subject.needsKey, subject.loadError], [true, null]);
    subject.reloadQuietly(context);
    await finish(new Error("Rate limited"));
    assert.deepEqual([subject.needsKey, subject.loadError], [false, "Rate limited"]);
    subject.reloadQuietly(context);
    await finish();
    assert.deepEqual([subject.needsKey, subject.loadError], [false, null]);
  });
});

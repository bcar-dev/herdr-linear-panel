import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NoKey } from "../../mods/linear-panel/api.js";
import { Loader } from "../../mods/linear-panel/parts/loader.js";
import { context } from "../host/mount.js";

// A loader whose loads wait until `finish(failure)` ends the oldest one still running
function loader() {
  const cx = context(), running = [];
  let loads = 0;
  const subject = new Loader(() => {
    loads++;
    return new Promise((resolve, reject) => running.push((failure) => (failure ? reject(failure) : resolve())));
  });
  const finish = async (failure) => {
    running.shift()(failure);
    await cx.idle();
  };
  return { subject, cx, finish, loads: () => loads };
}

describe("the loader", () => {
  it("runs one load at a time, and a load asked meanwhile once, after it", async () => {
    const { subject, cx, finish, loads } = loader();
    subject.reload(cx);
    subject.reloadQuietly(cx);
    subject.reloadQuietly(cx);
    assert.equal(loads(), 1);
    await finish();
    assert.equal(loads(), 2);
    await finish();
    assert.equal(loads(), 2);
    assert.ok(!subject.loading);
  });

  it("keeps the spinner a moment after a quick load, and shows none for a quiet one", async () => {
    const { subject, cx, finish } = loader();
    subject.reload(cx);
    await finish();
    assert.ok(subject.spinning);
    cx.elapse();
    assert.ok(!subject.spinning);
    subject.reloadQuietly(cx);
    assert.ok(!subject.spinning);
    await finish();
  });

  it("keeps the spinner of a change while a quiet load ends, and stops it once the change ends", async () => {
    const { subject, cx, finish } = loader();
    subject.begin();
    subject.reloadQuietly(cx);
    await finish();
    cx.elapse();
    assert.ok(subject.spinning);
    subject.end();
    subject.unspin(cx);
    cx.elapse();
    assert.ok(!subject.spinning);
  });

  it("tells a missing key from an error, and forgets both once a load goes well", async () => {
    const { subject, cx, finish } = loader();
    subject.reloadQuietly(cx);
    await finish(new NoKey());
    assert.deepEqual([subject.needsKey, subject.error], [true, null]);
    subject.reloadQuietly(cx);
    await finish(new Error("Rate limited"));
    assert.deepEqual([subject.needsKey, subject.error], [false, "Rate limited"]);
    subject.reloadQuietly(cx);
    await finish();
    assert.deepEqual([subject.needsKey, subject.error], [false, null]);
  });
});

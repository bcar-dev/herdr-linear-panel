import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PROPERTIES, copyCaps, copyShortcut, panelKey, propertyKey,
  spelled } from "../../mods/linear-panel/lib/keys.js";

const press = (key, held = {}) =>
  ({ key, modifiers: { platform: false, control: false, shift: false, alt: false, ...held } });

describe("spelled", () => {
  it("spells a shifted key in capitals", () => {
    assert.equal(spelled(press("e", { shift: true })), "E");
    assert.equal(spelled(press("e")), "e");
  });
});

describe("copyShortcut", () => {
  it("reads each entry's key under Cmd on macOS", () => {
    assert.equal(copyShortcut(press(".", { platform: true }), true), "id");
    assert.equal(copyShortcut(press(",", { platform: true, shift: true }), true), "url");
    assert.equal(copyShortcut(press("'", { platform: true, shift: true }), true), "title");
    assert.equal(copyShortcut(press("c", { platform: true }), true), "link");
    assert.equal(copyShortcut(press("c", { platform: true, alt: true }), true), "everything");
    assert.equal(copyShortcut(press(".", { platform: true, shift: true }), true), "branch");
    assert.equal(copyShortcut(press("p", { platform: true, alt: true }), true), "prompt");
  });

  it("reads the spelling a keyboard reports for a shifted or Alt-ed key", () => {
    assert.equal(copyShortcut(press("<", { platform: true, shift: true }), true), "url");
    assert.equal(copyShortcut(press("P", { platform: true, alt: true }), true), "prompt");
    assert.equal(copyShortcut(press("π", { platform: true, alt: true }), true), "prompt");
  });

  it("wants Ctrl instead of Cmd off macOS", () => {
    assert.equal(copyShortcut(press(".", { control: true }), false), "id");
    assert.equal(copyShortcut(press(".", { control: true }), true), null);
    assert.equal(copyShortcut(press(".", { platform: true }), false), null);
  });

  it("is null for a key that copies nothing", () => {
    assert.equal(copyShortcut(press("."), true), null);
    assert.equal(copyShortcut(press("k", { platform: true }), true), null);
  });
});

describe("the shortcuts as shown", () => {
  it("shows for each Copy entry the keys its shortcut is made of, and none for the entry without one", () => {
    assert.deepEqual(["id", "url", "everything", "markdown"].map(copyCaps), [["."], ["⇧", ","], ["⌥", "C"], null]);
  });

  it("gives each property the key the panel obeys for it", () => {
    for (const [page, , key] of PROPERTIES) {
      const shift = key !== key.toLowerCase();
      const asked = panelKey(press(key.toLowerCase(), { shift }),
        { mac: true, views: 2, ticked: false, pointed: true, aimed: false });
      assert.deepEqual(asked, { do: "choose", page });
    }
    assert.deepEqual(propertyKey("estimate"), { key: "E", caps: ["⇧", "E"] });
  });
});

describe("panelKey", () => {
  const idle = { mac: true, views: 2, ticked: false, pointed: false, aimed: false };
  const ask = (key, held, state) => panelKey(press(key, held), { ...idle, ...state });

  it("opens the command window on Cmd+K, Ctrl+K off macOS", () => {
    assert.deepEqual(ask("k", { platform: true }), { do: "commands" });
    assert.deepEqual(ask("k", { control: true }, { mac: false }), { do: "commands" });
    assert.equal(ask("k", { control: true }), null);
    assert.equal(ask("k", { platform: true, shift: true }), null);
  });

  it("copies when there is one issue to copy", () => {
    assert.deepEqual(ask(".", { platform: true }, { aimed: true }), { do: "copy", what: "id" });
    assert.equal(ask(".", { platform: true }), null);
  });

  it("composes on c and reloads on r", () => {
    assert.deepEqual(ask("c"), { do: "compose" });
    assert.deepEqual(ask("r"), { do: "reload" });
  });

  it("shows the display options on Shift+V", () => {
    assert.deepEqual(ask("v", { shift: true }), { do: "display" });
    assert.equal(ask("v"), null);
    assert.equal(ask("v", { shift: true, platform: true }), null);
  });

  it("picks the view in a digit's place, and no view past the last", () => {
    assert.deepEqual(ask("1"), { do: "view", nth: 0 });
    assert.deepEqual(ask("2"), { do: "view", nth: 1 });
    assert.equal(ask("3"), null);
    assert.equal(ask("0"), null);
    assert.deepEqual(ask("3", {}, { views: 3 }), { do: "view", nth: 2 });
  });

  it("opens a property's page for the ticked issues, else its choices for the pointed one", () => {
    assert.deepEqual(ask("s", {}, { ticked: true, pointed: true }), { do: "commands", page: "status" });
    assert.deepEqual(ask("p", {}, { pointed: true }), { do: "choose", page: "priority" });
    assert.deepEqual(ask("a", {}, { pointed: true }), { do: "choose", page: "assign" });
    assert.deepEqual(ask("e", { shift: true }, { pointed: true }), { do: "choose", page: "estimate" });
    assert.equal(ask("e", {}, { pointed: true }), null);
    assert.equal(ask("s"), null);
  });

  it("unassigns on i and unticks on Escape, when there is something to act on", () => {
    assert.deepEqual(ask("i", {}, { pointed: true }), { do: "unassign" });
    assert.deepEqual(ask("i", {}, { ticked: true }), { do: "unassign" });
    assert.equal(ask("i"), null);
    assert.deepEqual(ask("escape", {}, { ticked: true }), { do: "untick" });
    assert.equal(ask("escape"), null);
  });

  it("ticks the pointed issue on x, and the range to it with Shift", () => {
    assert.deepEqual(ask("x", {}, { pointed: true }), { do: "tick", extend: false });
    assert.deepEqual(ask("x", { shift: true }, { pointed: true }), { do: "tick", extend: true });
    assert.deepEqual(ask("X", { shift: true }, { pointed: true }), { do: "tick", extend: true });
    assert.equal(ask("x", {}, { ticked: true }), null);
  });

  it("leaves a key held with Ctrl, Alt or Cmd to Herdr", () => {
    assert.equal(ask("r", { platform: true }), null);
    assert.equal(ask("c", { control: true }), null);
    assert.equal(ask("1", { alt: true }), null);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { text } from "../host/elements.js";
import { teamMark } from "../../mods/linear-panel/ui.js";

describe("a team's mark", () => {
  it("is the team's own emoji when its icon is one", () => {
    const mark = teamMark({ name: "Backend", icon: "\u{1F680}", color: "#b45f45" }, 16);
    assert.equal(text(mark), "\u{1F680}");
  });

  it("is the team's first letter on a round of its color when its icon is a name of the tracker's own set", () => {
    const mark = teamMark({ name: "backend", icon: "Flower", color: "#b45f45" }, 16);
    assert.equal(text(mark), "B");
    assert.deepEqual([mark.$.style.bg, mark.$.style.size, mark.$.style.rounded_full], ["#b45f45", 16, true]);
  });

  it("is the same for a custom emoji of the workspace, which is a picture the panel cannot draw", () => {
    assert.equal(text(teamMark({ name: "Phoenix", icon: ":favicon_production:", color: "#bec2c8" }, 16)), "P");
  });

  it("is on a neutral grey when the team has no color, and the same without an icon", () => {
    const mark = teamMark({ name: "Ops", icon: null, color: null }, 16);
    assert.deepEqual([text(mark), mark.$.style.bg], ["O", "#8a8f98"]);
  });
});

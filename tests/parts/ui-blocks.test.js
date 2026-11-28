import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pillRow, roundButton } from "../../mods/linear-panel/ui.js";

const theme = { hover: "theme.hover" };

describe("pillRow", () => {
  it("is a line that lights up under the pointer, with the corners of a pill", () => {
    const { style, hover, id } = pillRow(theme, "line-1", 28).$;
    assert.deepEqual([id, style.h, style.rounded, style.px, style.gap], ["line-1", 28, 14, 10, 9]);
    assert.equal(style.cursor_pointer, true);
    assert.equal(style.items_center, true);
    assert.deepEqual(hover, { bg: "theme.hover" });
  });

  it("takes the padding and the gap that a place asks for", () => {
    const { style } = pillRow(theme, "line-2", 24, { px: 6, gap: 4 }).$;
    assert.deepEqual([style.px, style.gap, style.rounded], [6, 4, 12]);
  });

  it("can be told not to light up", () => {
    assert.equal(pillRow(theme, "line-3", 24, { lit: false }).$.hover, null);
  });
});

describe("roundButton", () => {
  it("is a round of its size, with whatever it holds centered, that a click can be put on", () => {
    const { style, id } = roundButton("b", 26).$;
    assert.deepEqual([id, style.size, style.rounded], ["b", 26, 13]);
    assert.deepEqual([style.cursor_pointer, style.justify_center, style.items_center], [true, true, true]);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { arrange } from "../../mods/linear-panel/lib/grid.js";

describe("arrange", () => {
  const six = [1, 2, 3, 4, 5, 6];

  it("fills each column down before the next: 3 columns of six make 2 rows", () => {
    assert.deepEqual(arrange(six, 3), [[1, 2], [3, 4], [5, 6]]);
  });

  it("makes 3 rows of 2 columns, and a single list for one column", () => {
    assert.deepEqual(arrange(six, 2), [[1, 2, 3], [4, 5, 6]]);
    assert.deepEqual(arrange(six, 1), [six]);
  });

  it("keeps the last column short when the items do not fill the grid, and leaves no empty column", () => {
    assert.deepEqual(arrange([1, 2, 3, 4, 5, 6, 7], 3), [[1, 2, 3], [4, 5, 6], [7]]);
    assert.deepEqual(arrange([1, 2], 3), [[1], [2]]);
    assert.deepEqual(arrange([], 3), []);
  });

  it("takes a column count below one as one", () => {
    assert.deepEqual(arrange(six, 0), [six]);
  });
});

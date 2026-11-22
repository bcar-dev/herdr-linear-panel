import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { brighten, isDark } from "../../mods/linear-panel/lib/color.js";
import { Drag } from "../../mods/linear-panel/lib/drag.js";
import { fitWidth, place, tipSpot } from "../../mods/linear-panel/lib/placement.js";
import { Selection, span } from "../../mods/linear-panel/lib/selection.js";

describe("span", () => {
  const shown = ["a", "b", "c", "d", "e"];

  it("takes everything between the two, in either direction", () => {
    assert.deepEqual(span(shown, "b", "d"), ["b", "c", "d"]);
    assert.deepEqual(span(shown, "d", "a"), ["a", "b", "c", "d"]);
    assert.deepEqual(span(shown, "c", "c"), ["c"]);
  });

  it("takes only the target when the start is not shown", () => {
    assert.deepEqual(span(shown, "gone", "d"), ["d"]);
    assert.deepEqual(span(shown, null, "d"), ["d"]);
  });
});

describe("Selection", () => {
  const order = ["a", "b", "c", "d"];

  it("ticks and unticks an issue", () => {
    const selection = new Selection();
    selection.click("b", false, order);
    assert.deepEqual(selection.list(), ["b"]);
    selection.click("b", false, order);
    assert.equal(selection.size, 0);
  });

  it("with Shift, ticks from the last box clicked to this one", () => {
    const selection = new Selection();
    selection.click("a", false, order);
    selection.click("c", true, order);
    assert.deepEqual(selection.list(), ["a", "b", "c"]);
  });

  it("with Shift and no box clicked yet, ticks only that one", () => {
    const selection = new Selection();
    selection.click("c", true, order);
    assert.deepEqual(selection.list(), ["c"]);
  });

  it("with Shift after everything was unticked, ticks only that one", () => {
    const selection = new Selection();
    selection.click("a", false, order);
    selection.clear();
    selection.click("c", true, order);
    assert.deepEqual(selection.list(), ["c"]);
    selection.click("c", false, order);
    selection.click("a", true, order);
    assert.deepEqual(selection.list(), ["a"]);
  });

  it("drops the ticks of issues that are gone", () => {
    const selection = new Selection();
    for (const id of ["a", "b", "c"]) selection.click(id, false, order);
    selection.keep(new Set(["a", "c"]));
    assert.deepEqual(selection.list(), ["a", "c"]);
    assert.equal(selection.has("b"), false);
  });
});

describe("Drag", () => {
  const start = { x: 100, y: 100 };

  it("is a click until the pointer has moved five pixels", () => {
    const drag = new Drag();
    drag.press("a", start);
    assert.equal(drag.follow({ x: 103, y: 100 }, { x: 3, y: 0 }), false);
    assert.equal(drag.carrying, false);
    assert.equal(drag.clicked("a"), true);
    assert.equal(drag.clicked("b"), false);
  });

  it("carries the issue once the pointer has left the press, and keeps carrying it back there", () => {
    const drag = new Drag();
    drag.press("a", start);
    assert.equal(drag.follow({ x: 100, y: 110 }, { x: 0, y: 10 }), true);
    assert.deepEqual(drag.ghost, { x: 0, y: 10 });
    assert.equal(drag.clicked("a"), false);
    assert.equal(drag.follow({ x: 100, y: 101 }, { x: 0, y: 1 }), true);
  });

  it("aims at another group and at none over the issue's own", () => {
    const drag = new Drag();
    drag.press("a", start);
    assert.equal(drag.aim("Done", false), true);
    assert.equal(drag.over, "Done");
    assert.equal(drag.aim("Done", false), false);
    assert.equal(drag.aim("Todo", true), true);
    assert.equal(drag.over, null);
  });

  it("ignores the pointer when nothing is pressed", () => {
    const drag = new Drag();
    assert.equal(drag.aim("Done", false), false);
    assert.equal(drag.follow({ x: 500, y: 500 }, { x: 0, y: 0 }), false);
    assert.equal(drag.drop(), null);
  });

  it("answers the pressed issue on a drop, and is over", () => {
    const drag = new Drag();
    drag.press("a", start);
    drag.follow({ x: 200, y: 200 }, { x: 1, y: 1 });
    drag.aim("Done", false);
    assert.equal(drag.drop(), "a");
    assert.deepEqual([drag.pressed, drag.over, drag.ghost], [null, null, null]);
  });

  it("survives the press that began it, and is ended by a later press elsewhere", () => {
    const drag = new Drag();
    drag.press("a", start);
    drag.settle();
    assert.equal(drag.pressed, "a");
    drag.settle();
    assert.equal(drag.pressed, null);
  });

  it("says whether a cancel ended a drag", () => {
    const drag = new Drag();
    assert.equal(drag.cancel(), false);
    drag.press("a", start);
    assert.equal(drag.cancel(), true);
  });
});

describe("isDark", () => {
  it("tells a dark color from a light one", () => {
    assert.deepEqual(["#011526", "#222326", "#000000"].map(isDark), [true, true, true]);
    assert.deepEqual(["#ffffff", "#f4f5f8", "#ffff00"].map(isDark), [false, false, false]);
  });

  it("takes for dark what is not a color", () => {
    assert.equal(isDark("theme.chrome"), true);
  });
});

describe("brighten", () => {
  it("makes a color stronger by a share, keeping its alpha", () => {
    // 51, 102, 153 times 1.32.
    assert.equal(brighten("#336699", 0.32), "#4387ca");
    assert.equal(brighten("#27a644", 0.32), "#33db5a");
    assert.equal(brighten("#336699cc", 0.32), "#4387cacc");
    assert.equal(brighten("#336699", 0), "#336699");
  });

  it("stops each channel at full strength", () => {
    assert.equal(brighten("#26b5ce", 0.32), "#32efff");
    assert.equal(brighten("#ffffff", 0.32), "#ffffff");
  });

  it("leaves alone what is not such a color", () => {
    assert.equal(brighten("red", 0.5), "red");
    assert.equal(brighten("#369", 0.5), "#369");
  });
});

describe("place", () => {
  const frame = { x: 900, y: 40, width: 400, height: 700 };

  it("opens at the press when the popup fits", () => {
    assert.deepEqual(place({ point: { x: 950, y: 100 }, frame }, 280, 200), { x: 950, y: 100 });
  });

  it("pulls the popup back inside the panel's right and bottom edges", () => {
    assert.deepEqual(place({ point: { x: 1250, y: 700 }, frame }, 280, 200), { x: 1020, y: 540 });
  });

  it("never starts before the panel's left or top edge", () => {
    assert.deepEqual(place({ point: { x: 950, y: 100 }, frame }, 600, 900), { x: 900, y: 40 });
  });

  it("opens at the pointer without a press or a panel", () => {
    assert.equal(place({ frame }, 280, 200), "pointer");
    assert.equal(place({ point: { x: 1, y: 1 } }, 280, 200), "pointer");
    assert.equal(place(undefined, 280, 200), "pointer");
  });

  it("opens beside an entry, on its right when there is room", () => {
    const beside = { x: 905, y: 300, width: 80, height: 31 };
    assert.deepEqual(place({ beside, frame }, 300, 200), { x: 997, y: 294 });
  });

  it("opens on the entry's left when the right would pass the panel, and stays above its bottom", () => {
    const beside = { x: 1010, y: 650, width: 270, height: 31 };
    assert.deepEqual(place({ beside, frame }, 300, 200), { x: 698, y: 540 });
  });
});

describe("tipSpot", () => {
  const frame = { x: 900, y: 40, width: 400, height: 700 };
  const small = { width: 100, height: 28 };

  it("hangs under a control, centered on its middle", () => {
    assert.deepEqual(tipSpot({ x: 1090, y: 50, width: 20, height: 20 }, frame, "below", small),
      { center: 200, top: 36 });
  });

  it("stays against the panel's edge when, centered, it would pass that edge", () => {
    assert.deepEqual(tipSpot({ x: 930, y: 50, width: 20, height: 20 }, frame, "below", small), { left: 4, top: 36 });
    assert.deepEqual(tipSpot({ x: 1260, y: 48, width: 26, height: 26 }, frame, "below", small), { right: 4, top: 40 });
    // Just enough room on the left: 54 px to the edge for the 50 px half and the 4 px kept.
    assert.deepEqual(tipSpot({ x: 944, y: 50, width: 20, height: 20 }, frame, "below", small), { center: 54, top: 36 });
  });

  it("sits above the control when asked", () => {
    assert.deepEqual(tipSpot({ x: 1000, y: 690, width: 80, height: 28 }, frame, "above", small),
      { center: 140, bottom: 56 });
  });

  it("stays under a control as long as the panel has room for its height there, and sits above it otherwise", () => {
    const control = (y) => ({ x: 1090, y, width: 20, height: 20 });
    // The panel ends at 740: under a control at 680, 28 px fit with the gap before and the 4 px kept after.
    assert.deepEqual(tipSpot(control(680), frame, "below", small), { center: 200, top: 666 });
    assert.deepEqual(tipSpot(control(684), frame, "below", small), { center: 200, bottom: 62 });
    const tall = { width: 100, height: 200 };
    assert.deepEqual(tipSpot(control(500), frame, "below", tall), { center: 200, top: 486 });
    assert.deepEqual(tipSpot(control(520), frame, "below", tall), { center: 200, bottom: 226 });
  });
});

describe("fitWidth", () => {
  it("fits the longest label beside what else a row holds", () => {
    assert.equal(fitWidth(["Todo", "Ready for Release"], 104, 208, 300), 223);
  });

  it("stays between the least and the most", () => {
    assert.equal(fitWidth(["Low"], 104, 208, 300), 208);
    assert.equal(fitWidth([], 104, 208, 300), 208);
    assert.equal(fitWidth(["A status with a name far too long to show whole"], 104, 208, 300), 300);
  });
});

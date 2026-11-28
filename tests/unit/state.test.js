import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { brighten, isDark, mix } from "../../mods/linear-panel/lib/color.js";
import { Drag } from "../../mods/linear-panel/lib/drag.js";
import { fitWidth, listFit, place, sideOf, textWidth, tooltipSpot } from "../../mods/linear-panel/lib/placement.js";
import { Selection, span } from "../../mods/linear-panel/lib/selection.js";
import { compareText, message } from "../../mods/linear-panel/lib/text.js";

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
    // 51, 102, 153 times 1.32
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

  it("leaves the gap asked between the entry and the popup", () => {
    const beside = { x: 1010, y: 300, width: 90, height: 28 };
    assert.deepEqual(place({ beside, frame, gap: 6 }, 300, 200), { x: 704, y: 294 });
  });

  it("opens on the right, past the panel, when the window has no room on the left either", () => {
    const beside = { x: 10, y: 300, width: 80, height: 31 };
    assert.deepEqual(place({ beside, frame: { x: 0, y: 40, width: 300, height: 700 } }, 300, 200), { x: 102, y: 294 });
  });
});

describe("place beside, narrow", () => {
  const frame = { x: 1000, y: 40, width: 316, height: 700 };

  it("stays on the control's right where there is room", () => {
    assert.deepEqual(place({ beside: { x: 1010, y: 200, width: 100, height: 24 }, frame, narrow: true }, 180, 300),
      { x: 1122, y: 194 });
  });

  it("never flips to the left: it is pulled back inside the panel's right edge instead", () => {
    const { x } = place({ beside: { x: 1010, y: 200, width: 160, height: 24 }, frame, narrow: true }, 240, 300);
    assert.equal(x, 1000 + 316 - 240 - 4);
  });
});

describe("tooltipSpot on the right", () => {
  const frame = { x: 1000, y: 40, width: 400, height: 700 }, card = { width: 180, height: 100 };

  it("hangs beside the control, centered on it down the panel", () => {
    assert.deepEqual(tooltipSpot({ x: 1030, y: 300, width: 100, height: 24 }, frame, "right", card),
      { left: 136, top: 222 });
  });

  it("is pulled back inside the panel at its right edge and its top and bottom", () => {
    assert.deepEqual(tooltipSpot({ x: 1250, y: 44, width: 100, height: 24 }, frame, "right", card),
      { left: 216, top: 4 });
    assert.equal(tooltipSpot({ x: 1030, y: 720, width: 100, height: 24 }, frame, "right", card).top, 596);
  });
});

describe("tooltipSpot", () => {
  const frame = { x: 900, y: 40, width: 400, height: 700 };
  const small = { width: 100, height: 28 };

  it("hangs under a control, centered on its middle", () => {
    assert.deepEqual(tooltipSpot({ x: 1090, y: 50, width: 20, height: 20 }, frame, "below", small),
      { center: 200, top: 36 });
  });

  it("stays against the panel's edge when, centered, it would pass that edge", () => {
    assert.deepEqual(tooltipSpot({ x: 930, y: 50, width: 20, height: 20 }, frame, "below", small),
      { left: 4, top: 36 });
    assert.deepEqual(tooltipSpot({ x: 1260, y: 48, width: 26, height: 26 }, frame, "below", small),
      { right: 4, top: 40 });
    // Just enough room on the left: 54 px to the edge for the 50 px half and the 4 px kept
    assert.deepEqual(tooltipSpot({ x: 944, y: 50, width: 20, height: 20 }, frame, "below", small),
      { center: 54, top: 36 });
  });

  it("sits above the control when asked", () => {
    assert.deepEqual(tooltipSpot({ x: 1000, y: 690, width: 80, height: 28 }, frame, "above", small),
      { center: 140, bottom: 56 });
  });

  it("stays under a control as long as the panel has room for its height there, and sits above it otherwise", () => {
    const control = (y) => ({ x: 1090, y, width: 20, height: 20 });
    // The panel ends at 740: under a control at 680, 28 px fit with the gap before and the 4 px kept after
    assert.deepEqual(tooltipSpot(control(680), frame, "below", small), { center: 200, top: 666 });
    assert.deepEqual(tooltipSpot(control(684), frame, "below", small), { center: 200, bottom: 62 });
    const tall = { width: 100, height: 200 };
    assert.deepEqual(tooltipSpot(control(500), frame, "below", tall), { center: 200, top: 486 });
    assert.deepEqual(tooltipSpot(control(520), frame, "below", tall), { center: 200, bottom: 226 });
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

describe("mix", () => {
  it("gives a color between two, channel by channel, and keeps the first one's alpha", () => {
    assert.equal(mix("#000000", "#ffffff", 0.5), "#808080");
    assert.equal(mix("#102030cc", "#304050", 0), "#102030cc");
    assert.equal(mix("#102030", "#304050", 1), "#304050");
  });

  it("gives back the first color when one is not a hex color", () => {
    assert.equal(mix("#102030", "theme", 0.5), "#102030");
  });
});

describe("listFit", () => {
  it("opens the whole list below the control when the room there holds it", () => {
    assert.deepEqual(listFit({ below: 300, above: 200 }, 9, 28, 44, 6), { side: "below", visible: 9 });
  });

  it("opens the whole list above it when only the room there holds it", () => {
    assert.deepEqual(listFit({ below: 100, above: 400 }, 9, 28, 44, 6), { side: "above", visible: 9 });
  });

  it("scrolls only when neither side holds it, on the side with more room, to the rows that fit", () => {
    assert.deepEqual(listFit({ below: 150, above: 200 }, 9, 28, 44, 6), { side: "above", visible: 6 });
    assert.deepEqual(listFit({ below: 330, above: 200 }, 16, 28, 44, 6), { side: "below", visible: 10 });
  });

  it("keeps at least the least rows, and never more rows than there are", () => {
    assert.deepEqual(listFit({ below: 60, above: 70 }, 9, 28, 44, 6).visible, 6);
    assert.equal(listFit({ below: 60, above: 70 }, 3, 28, 44, 6).visible, 3);
  });
});

describe("sideOf", () => {
  const frame = { x: 0, y: 0, width: 400, height: 700 };

  it("is below while the popup fits under the control, above when it fits only over it", () => {
    assert.equal(sideOf({ x: 10, y: 100, width: 20, height: 20 }, frame, 200, 1), "below");
    assert.equal(sideOf({ x: 10, y: 600, width: 20, height: 20 }, frame, 200, 1), "above");
  });

  it("is on the side with more room when neither fits", () => {
    assert.equal(sideOf({ x: 10, y: 300, width: 20, height: 20 }, frame, 600, 1), "below");
    assert.equal(sideOf({ x: 10, y: 400, width: 20, height: 20 }, frame, 600, 1), "above");
  });
});

describe("place above", () => {
  it("puts the popup's bottom edge a little over the control, inside the panel", () => {
    const frame = { x: 0, y: 0, width: 400, height: 700 };
    assert.deepEqual(place({ above: { x: 50, y: 500, width: 30, height: 20 }, frame }, 200, 300), { x: 50, y: 194 });
    assert.equal(place({ above: { x: 50, y: 100, width: 30, height: 20 }, frame }, 200, 300).y, 0);
  });
});

describe("compareText", () => {
  it("orders two texts as sort wants, and is 0 for equal ones", () => {
    assert.deepEqual([compareText("a", "b"), compareText("b", "a"), compareText("a", "a")], [-1, 1, 0]);
    assert.deepEqual(["b", "c", "a"].sort(compareText), ["a", "b", "c"]);
  });
});

describe("message", () => {
  it("is the message of an error, or the value itself", () => {
    assert.deepEqual([message(new Error("down")), message("plain"), message(undefined)],
      ["down", "plain", "undefined"]);
  });
});

describe("textWidth", () => {
  it("reckons a width from the length, with the card's character width unless one is given", () => {
    assert.deepEqual([textWidth("abcd"), textWidth("abcd", 7), textWidth("")], [24, 28, 0]);
  });
});

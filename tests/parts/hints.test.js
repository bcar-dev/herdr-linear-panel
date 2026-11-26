import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { element } from "../host/elements.js";
import { context } from "../host/mount.js";
import { Hints } from "../../mods/linear-panel/parts/hints.js";

describe("Hints.press, which a control's own handler calls", () => {
  const over = (node, on, cx) => { for (const handler of node.$.handlers.on_hover) handler(on, cx); };
  const move = (node, cx) => {
    for (const handler of node.$.handlers.on_mouse_move) handler({ bounds: { x: 0, y: 0, width: 10, height: 10 } }, cx);
  };

  it("keeps the tooltip of the control the pointer is on away, whichever handler of it runs first", () => {
    const cx = context(), hints = new Hints(), node = hints.on(element("div"), "Label", { key: "k" });
    hints.begin();
    over(node, true, cx);
    move(node, cx);
    hints.press(cx);
    cx.elapse();
    assert.equal(hints.tip, null);
    over(node, false, cx);
    move(node, cx);
    cx.elapse();
    assert.notEqual(hints.tip, null);
  });
});

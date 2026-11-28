import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { element } from "../host/elements.js";
import { fakeContext } from "../host/mount.js";
import { Hints } from "../../mods/linear-panel/parts/hints.js";

describe("Hints.press, which a control's own handler calls", () => {
  const over = (node, on, context) => { for (const handler of node.$.handlers.on_hover) handler(on, context); };
  const move = (node, context) => {
    const bounds = { x: 0, y: 0, width: 10, height: 10 };
    for (const handler of node.$.handlers.on_mouse_move) handler({ bounds }, context);
  };

  it("keeps the tooltip of the control the pointer is on away, whichever handler of it runs first", () => {
    const context = fakeContext(), hints = new Hints(), node = hints.on(element("div"), "Label", { key: "k" });
    hints.begin();
    over(node, true, context);
    move(node, context);
    hints.press(context);
    context.elapse();
    assert.equal(hints.tip, null);
    over(node, false, context);
    move(node, context);
    context.elapse();
    assert.notEqual(hints.tip, null);
  });
});

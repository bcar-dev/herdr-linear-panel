// The example layout a person can copy: it must hold the two blocks the mod needs, and none of anyone's settings.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";
import { MOD } from "../../mods/linear-panel/config.js";
import { SLOT } from "../../mods/linear-panel/tracker.js";

const file = new URL(`../../mods/${MOD}/examples/main-linear.json`, import.meta.url);
const layout = JSON.parse(readFileSync(file, "utf8"));

function* nodes(node) {
  yield node;
  for (const child of node.children ?? []) yield* nodes(child);
}
const byId = (id) => [...nodes(layout)].find((node) => node.id === id);

it("has the panel in the right panel's stack, under the id the mod looks for, with no settings", () => {
  const stack = byId("panel-body");
  assert.equal(stack.type, "stack");
  assert.deepEqual(stack.children.find((child) => child.id === SLOT).content, { mod: MOD });
});

it("has the panel's button in the top bar, beside the tab bar", () => {
  const top = byId("top");
  assert.deepEqual(top.children.map((child) => child.content),
    [{ mod: "tabs" }, { mod: MOD, props: { part: "button" } }]);
});

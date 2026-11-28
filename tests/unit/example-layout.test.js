// The example layout a person can copy: it must hold the two blocks the mod needs, and no one's own settings
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

it("has the panel in the right panel's stack, under the id the mod looks for", () => {
  const stack = byId("panel-body");
  assert.equal(stack.type, "stack");
  assert.equal(stack.children.find((child) => child.id === SLOT).content.mod, MOD);
});

it("gives the panel two settings, a prompt before the issue and one after it, each an example to replace", () => {
  const { props } = byId(SLOT).content;
  assert.deepEqual(Object.keys(props), ["pre_linear_issue_prompt", "post_linear_issue_prompt"]);
  for (const prompt of [props.pre_linear_issue_prompt, props.post_linear_issue_prompt]) {
    assert.match(prompt[0], /example prompt\. Replace these lines with your own/);
    assert.ok(prompt.every((line) => typeof line === "string"));
  }
});

it("has the panel's button in the top bar, beside the tab bar", () => {
  const top = byId("top");
  assert.deepEqual(top.children.map((child) => child.content),
    [{ mod: "tabs" }, { mod: MOD, props: { part: "button" } }]);
});

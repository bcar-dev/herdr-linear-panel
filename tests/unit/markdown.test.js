import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { markdownBlocks } from "../../mods/linear-panel/lib/markdown.js";

// The blocks without their places, which have tests of their own
const plain = (/** @type {string} */ source) => markdownBlocks(source)
  .map((block) => "heading" in block
    ? { heading: { level: block.heading.level, text: block.heading.text } } : { markdown: block.markdown });

describe("markdownBlocks", () => {
  it("finds a heading of each level, with the text around them", () => {
    const source = ["# one", "## two", "### three", "#### four", "##### five", "###### six", "text", "", "more"]
      .join("\n");
    assert.deepEqual(plain(source), [
      ...["one", "two", "three", "four", "five", "six"]
        .map((text, index) => ({ heading: { level: index + 1, text } })),
      { markdown: "text\n\nmore" },
    ]);
  });

  it("keeps the lines between two headings as one block", () => {
    assert.deepEqual(plain("a\n- b\n- c\n## d\ne"),
      [{ markdown: "a\n- b\n- c" }, { heading: { level: 2, text: "d" } }, { markdown: "e" }]);
  });

  it("does not take a # in a code fence for a heading", () => {
    const source = "```sh\n# comment\n```\n~~~\n## also\n~~~";
    assert.deepEqual(plain(source), [{ markdown: source }]);
  });

  it("does not take a hashtag, seven #, or a bare # for a heading", () => {
    const source = "#hashtag\n####### seven\n#";
    assert.deepEqual(plain(source), [{ markdown: source }]);
  });

  it("keeps the inline marks of a heading and drops its closing #", () => {
    assert.deepEqual(plain("## a **b** ##"), [{ heading: { level: 2, text: "a **b**" } }]);
  });

  it("gives no block for no text", () => {
    assert.deepEqual(plain(""), []);
    assert.deepEqual(plain("\n\n"), []);
  });
});

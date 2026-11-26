import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanAnswer, cleanText } from "../../mods/linear-panel/lib/sanitize.js";

describe("cleanText", () => {
  it("drops a sequence that writes the clipboard", () => {
    assert.equal(cleanText("Fix\u001b]52;c;aGk=\u0007 login"), "Fix login");
    assert.equal(cleanText("Fix\u001b]52;c;aGk=\u001b\\ login"), "Fix login");
  });

  it("drops color and cursor sequences, and lone escapes", () => {
    assert.equal(cleanText("\u001b[31mred\u001b[0m"), "red");
    assert.equal(cleanText("a\u001b[2Jb\u009b1;2Hc"), "abc");
    assert.equal(cleanText("a\u001bMb"), "ab");
  });

  it("turns line breaks and tabs of a label into spaces, and drops other controls and carriage returns", () => {
    assert.equal(cleanText("one\ntwo\tthree\r\u0007four\u007f"), "one two threefour");
  });

  it("keeps the breaks of prose", () => {
    assert.equal(cleanText("one\r\ntwo\tthree\u0007", true), "one\ntwo\tthree");
  });

  it("leaves ordinary text, emoji and accents as they are", () => {
    assert.equal(cleanText("Café \u{1F680} naïve"), "Café \u{1F680} naïve");
  });
});

describe("cleanAnswer", () => {
  it("cleans every string however deep, keeping breaks only in prose fields", () => {
    const answer = { issue: { title: "a\nb\u001b[1m", description: "x\ny\u0007", comments: { nodes: [
      { body: "p\nq\u001b]0;t\u0007", user: { name: "N\u0000" } },
    ] } }, count: 3, none: null };
    assert.deepEqual(cleanAnswer(answer), { issue: { title: "a b", description: "x\ny", comments: { nodes: [
      { body: "p\nq", user: { name: "N" } },
    ] } }, count: 3, none: null });
  });
});

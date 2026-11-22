// Every line of the project stays within 120 characters, as .editorconfig says. This test holds the rule.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { it } from "node:test";

const ROOT = new URL("../..", import.meta.url).pathname;
const MOST = 120;
// Written by Herdr or by a tool: not the project's to wrap.
const SKIPPED = ["gpui-kit.d.ts", "node_modules", ".git", ".scratch"];
const CHECKED = /\.(js|ts|json|md)$|^\.editorconfig$/;

function* files(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    if (SKIPPED.includes(entry.name)) continue;
    const path = join(folder, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (CHECKED.test(entry.name)) yield path;
  }
}

// A row of a Markdown table cannot be broken, nor the package manager's name with its checksum.
const unbreakable = (path, line) => (path.endsWith(".md") && line.startsWith("|"))
  || (path.endsWith("package.json") && line.includes('"packageManager"'));

it("keeps every line within 120 characters", () => {
  const long = [];
  for (const path of files(ROOT)) {
    readFileSync(path, "utf8").split("\n").forEach((line, nth) => {
      if (line.length > MOST &&
        !unbreakable(path, line)) long.push(`${path.slice(ROOT.length)}:${nth + 1} (${line.length})`);
    });
  }
  assert.deepEqual(long, []);
});

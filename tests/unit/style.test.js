// Every line of the project stays within 120 characters, as .editorconfig says. This test holds the rule
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { it } from "node:test";

const CHECKED = /\.(js|ts|json|md)$|^\.editorconfig$/;
const MOST = 120;
const ROOT = new URL("../..", import.meta.url).pathname;
// Written by Herdr: not the project's to wrap
const SKIPPED = ["gpui-kit.d.ts"];

// The project's files as git sees them, new ones included: nothing that .gitignore leaves out, such as an editor's or
// a tool's own folder
const files = () => execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"],
  { cwd: ROOT, encoding: "utf8" })
  .split("\n")
  .filter((path) => CHECKED.test(basename(path)) && !SKIPPED.includes(basename(path)));

// A row of a Markdown table cannot be broken, nor the package manager's name with its checksum
const unbreakable = (path, line) => (path.endsWith(".md") && line.startsWith("|"))
  || (path.endsWith("package.json") && line.includes('"packageManager"'));

it("keeps every line within 120 characters", () => {
  const long = [];
  for (const path of files()) {
    readFileSync(join(ROOT, path), "utf8")
      .split("\n")
      .forEach((line, nth) => {
        if (line.length > MOST &&
        !unbreakable(path, line)) long.push(`${path}:${nth + 1} (${line.length})`);
      });
  }
  assert.deepEqual(long, []);
});

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

// The mod's JavaScript, as { path, lines }
const modSources = () => files()
  .filter((path) => path.startsWith("mods/") && path.endsWith(".js"))
  .map((path) => ({ path, lines: readFileSync(join(ROOT, path), "utf8")
    .split("\n") }));

it("sizes text, corners and gaps from the shared scale in style.js", () => {
  const bare = /\.(text_size|rounded|gap)\(\s*-?\d/;
  const found = modSources()
    .filter(({ path }) => !path.endsWith("/style.js"))
    .flatMap(({ path, lines }) => lines.flatMap((line, nth) => (bare.test(line) ? [`${path}:${nth + 1}`] : [])));
  assert.deepEqual(found, []);
});

// Inside a group sized by its content, Herdr lays the group out as if it were empty when a child has a negative
// margin. These three sit in a box of fixed width or a column, where the margin is safe
const SAFE_NEGATIVE_MARGINS = [
  "mods/linear-panel/parts/commands.js: .mx(-PADDING_PX / 2)",
  "mods/linear-panel/parts/issue-page.js: .mx(-10)",
  "mods/linear-panel/ui.js: .ml(-half)",
];

it("draws no negative margin but the ones known to be safe", () => {
  const negative = /\.m[xytblr]?\(\s*-/;
  const found = modSources()
    .flatMap(({ path, lines }) => lines.filter((line) => negative.test(line))
      .map((line) => `${path}: ${line.trim()}`));
  assert.deepEqual(found, SAFE_NEGATIVE_MARGINS);
});

// How the mod's files import each other: no file imports itself back through others, and lib/ holds rules that node
// runs without Herdr
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { it } from "node:test";

const MOD = new URL("../../mods/linear-panel", import.meta.url).pathname;
const IMPORT = /^import[^"]*"([^"]+)";$/gm;
const HOST_MODULES = ["herdr", "gpui-kit", "gpui-base"];

/** @returns {Map<string, string[]>} each file of the mod, by its path in the mod, and what it imports */
function imports() {
  const found = new Map();
  for (const entry of readdirSync(MOD, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
    const path = relative(MOD, join(entry.parentPath, entry.name));
    const names = [...readFileSync(join(MOD, path), "utf8")
      .matchAll(IMPORT)].map(([, name]) => (name.startsWith(".") ? join(dirname(path), name) : name));
    found.set(path, names);
  }
  return found;
}

it("has no file that imports itself back through others", () => {
  const graph = imports(), loops = [], done = new Set();
  /** @param {string} path @param {string[]} trail */
  const walk = (path, trail) => {
    if (trail.includes(path)) return void loops.push([...trail.slice(trail.indexOf(path)), path].join(" > "));
    if (done.has(path)) return;
    done.add(path);
    for (const next of graph.get(path) ?? []) walk(next, [...trail, path]);
  };
  for (const path of graph.keys()) walk(path, []);
  assert.deepEqual(loops, []);
});

it("keeps lib/ free of Herdr, so node runs its rules", () => {
  const graph = imports();
  /** @param {string} path @param {Set<string>} seen @returns {string[]} the modules of Herdr it reaches */
  const reached = (path, seen = new Set()) => {
    if (HOST_MODULES.includes(path)) return [path];
    if (seen.has(path)) return [];
    seen.add(path);
    return (graph.get(path) ?? []).flatMap((next) => reached(next, seen));
  };
  const leaks = [...graph.keys()].filter((path) => path.startsWith("lib/"))
    .flatMap((path) => reached(path)
      .map((name) => `${path} reaches ${name}`));
  assert.deepEqual(leaks, []);
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PRIORITIES, VIEWS, copiesFor } from "../../mods/linear-panel/config.js";
import { PROPERTIES } from "../../mods/linear-panel/lib/keys.js";
import { CycleTense, PIE_ICONS, cycleIcon } from "../../mods/linear-panel/lib/cycles.js";
import { STATUS_ICONS } from "../../mods/linear-panel/lib/teams.js";

const MOD = "mods/linear-panel";

/** @param {string} directory */
const sources = (directory) => readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "icons" || entry.name === "examples" ? [] : sources(path);
    return path.endsWith(".js") ? [readFileSync(path, "utf8")] : [];
  });

describe("the icon tables", () => {
  it("name only icons that have a file", () => {
    const names = [
      ...Object.values(STATUS_ICONS), ...PIE_ICONS, ...PRIORITIES.map((entry) => entry.icon),
      ...VIEWS.map((entry) => entry.icon), ...PROPERTIES.map((entry) => entry.icon),
      ...copiesFor(1)
        .map((entry) => entry.icon), ...Object.values(CycleTense)
        .map(cycleIcon),
    ];
    for (const name of names) assert.ok(existsSync(`${MOD}/icons/${name}.svg`), name);
  });

  it("leave no icon file unreferenced", () => {
    const code = sources(MOD)
      .join("\n");
    const files = readdirSync(`${MOD}/icons`)
      .filter((file) => file.endsWith(".svg"))
      .map((file) => file.slice(0, -4));
    assert.deepEqual(files.filter((name) => !code.includes(`"${name}"`)), []);
  });
});

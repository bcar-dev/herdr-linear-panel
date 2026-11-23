import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cycleName, cycleNote, pickable, progressIcon, span, tense, weekdaysLeft }
  from "../../mods/linear-panel/lib/cycles.js";

// The days a cycle shows are those of the computer's time zone: here, the one the team's cycles start at midnight in.
process.env.TZ = "Europe/Paris";

const cycle = (number, startsAt, endsAt) => ({ id: `c${number}`, number, name: null, startsAt, endsAt });
const C86 = cycle(86, "2026-10-12T22:00:00.000Z", "2026-10-26T23:00:00.000Z");
const C87 = cycle(87, "2026-10-26T23:00:00.000Z", "2026-11-09T23:00:00.000Z");
const C88 = cycle(88, "2026-11-09T23:00:00.000Z", "2026-11-23T23:00:00.000Z");
const C89 = cycle(89, "2026-11-23T23:00:00.000Z", "2026-12-07T23:00:00.000Z");
const C90 = cycle(90, "2026-12-07T23:00:00.000Z", "2026-12-21T23:00:00.000Z");
const CYCLES = [C90, C86, C88, C87, C89];
// Monday 23 November, the last day of cycle 88.
const NOW = Date.parse("2026-11-23T10:00:00.000Z");

describe("tense", () => {
  it("tells the current cycle, the next, those after it, the previous and those before it", () => {
    assert.deepEqual([C86, C87, C88, C89, C90].map((c) => tense(c, CYCLES, NOW)),
      ["past", "previous", "current", "next", "future"]);
  });

  it("takes a cycle that starts at this very moment for the current one", () => {
    assert.equal(tense(C89, CYCLES, Date.parse(C89.startsAt)), "current");
  });
});

describe("pickable", () => {
  it("lists the current cycle and those to come in order, then the previous one, and leaves older ones out", () => {
    assert.deepEqual(pickable(CYCLES, NOW).map((c) => c.number), [88, 89, 90, 87]);
  });
});

describe("wording", () => {
  it("names a cycle by its own name, else by its number", () => {
    assert.equal(cycleName(C88), "Cycle 88");
    assert.equal(cycleName({ ...C88, name: "Launch" }), "Launch");
  });

  it("gives a cycle's first and last days, the last being the day before the midnight it ends at", () => {
    assert.equal(span(C88), "Nov 10 - Nov 23");
    assert.equal(span(C90), "Dec 8 - Dec 21");
  });

  it("follows the days with where the cycle stands, when Linear words that", () => {
    assert.deepEqual([C87, C88, C89, C90].map((c) => cycleNote(c, CYCLES, NOW)),
      ["Oct 27 - Nov 9 · Previous", "Nov 10 - Nov 23 · Current", "Nov 24 - Dec 7 · Upcoming", "Dec 8 - Dec 21"]);
  });
});

describe("weekdaysLeft", () => {
  it("counts the weekdays to the end, today included, weekends left out", () => {
    assert.equal(weekdaysLeft(C88, NOW), 1);
    assert.equal(weekdaysLeft(C88, Date.parse("2026-11-21T10:00:00.000Z")), 1);
    assert.equal(weekdaysLeft(C88, Date.parse("2026-11-20T10:00:00.000Z")), 2);
    assert.equal(weekdaysLeft(C88, Date.parse("2026-11-10T08:00:00.000Z")), 10);
  });
});

describe("progressIcon", () => {
  it("fills a started status's pie by eighths, empty at nothing and checked when all is done", () => {
    assert.deepEqual([0, 0.01, 0.5, 0.7, 0.99, 1].map(progressIcon),
      ["status-unstarted", "status-started-1", "status-started-4", "status-started-6", "status-started-7",
        "status-completed"]);
  });
});

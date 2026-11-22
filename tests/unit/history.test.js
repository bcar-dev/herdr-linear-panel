import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { timeInStatuses, timeLabel } from "../../mods/linear-panel/lib/history.js";

const TRIAGE = { id: "triage", name: "Triage" }, DOING = { id: "doing", name: "In Progress" },
  REVIEW = { id: "review", name: "Code Review" };
const at = (time) => `2026-11-19T${time}.000Z`;
const NOW = Date.parse("2026-11-22T16:00:00.000Z");

describe("timeInStatuses", () => {
  it("tells the time in each status, and which one the issue is in", () => {
    const spans = [
      { state: TRIAGE, startedAt: at("16:06:42"), endedAt: at("16:50:22") },
      { state: DOING, startedAt: at("16:50:22"), endedAt: null },
    ];
    assert.deepEqual(timeInStatuses(spans, NOW), [
      { state: TRIAGE, ms: 2_620_000, current: false },
      { state: DOING, ms: NOW - Date.parse(at("16:50:22")), current: true },
    ]);
  });

  it("counts once a status entered twice, where it was first entered", () => {
    const spans = [
      { state: DOING, startedAt: at("10:00:00"), endedAt: at("11:00:00") },
      { state: REVIEW, startedAt: at("11:00:00"), endedAt: at("11:00:05") },
      { state: DOING, startedAt: at("11:00:05"), endedAt: null },
    ];
    const times = timeInStatuses(spans, Date.parse(at("12:00:05")));
    assert.deepEqual(times.map(({ state, ms, current }) => [state.name, ms, current]),
      [["In Progress", 7_200_000, true], ["Code Review", 5000, false]]);
  });

  it("leaves out a status that was deleted since", () => {
    assert.deepEqual(timeInStatuses([{ state: null, startedAt: at("10:00:00"), endedAt: at("11:00:00") }], NOW), []);
  });
});

describe("timeLabel", () => {
  it("tells a time in its longest unit, rounded, and in weeks at most", () => {
    const SECOND = 1000, MINUTE = 60 * SECOND, HOUR = 60 * MINUTE, DAY = 24 * HOUR;
    assert.deepEqual(
      [0, 5 * SECOND, 2_620_000, 3 * HOUR, 2.97 * DAY, 15 * DAY, 100 * DAY, 364 * DAY, 800 * DAY].map(timeLabel),
      ["0s", "5s", "44min", "3h", "3d", "2w", "14w", "52w", "114w"]);
  });
});

// How long an issue has been in each status. Pure rules with no calls to Herdr, so node can test them (tests/unit)

const SECOND = 1000, MINUTE = 60 * SECOND, HOUR = 60 * MINUTE;
export const DAY_MS = 24 * HOUR;
const YEAR = 365.25 * DAY_MS, MONTH = YEAR / 12;
// Longest first. Days go up to a month ("15d", not "2w"). A month is a twelfth of a year, so twelve months never show:
// a year starts where they would
/** @type {{ unit: string, length: number }[]} */
const UNITS = [
  { unit: "y", length: YEAR }, { unit: "mo", length: MONTH }, { unit: "d", length: DAY_MS },
  { unit: "h", length: HOUR }, { unit: "min", length: MINUTE }, { unit: "s", length: SECOND },
];

// In the order the issue first entered each status. `spans` are oldest first; the one still running lasts until `now`
// and is the `current` one. A status entered several times counts once
/**
 * @param {StatusSpan[]} spans
 * @param {number} now
 * @returns {StatusTime[]}
 */
export function timeInStatuses(spans, now) {
  /** @type {Map<string, StatusTime>} */
  const times = new Map();
  for (const { state, startedAt, endedAt } of spans) {
    if (!state) continue;
    const ms = Math.max(0, (endedAt ? Date.parse(endedAt) : now) - Date.parse(startedAt));
    times.set(state.id, { state, ms: (times.get(state.id)?.ms ?? 0) + ms, current: !endedAt });
  }
  return [...times.values()];
}

// Cut down to whole units as the tracker does (7.6 hours read "7h"): "5s", "44min", "3d"
/** @param {number} ms */
export function timeLabel(ms) {
  const age = Math.max(0, ms), { unit, length } = UNITS.find((entry) => age >= entry.length) ?? UNITS[UNITS.length - 1];
  return `${Math.floor(age / length)}${unit}`;
}

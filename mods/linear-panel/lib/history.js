// How long an issue has been in each status. Pure rules with no calls to Herdr, so node can test them (tests/unit).

const SECOND = 1000, MINUTE = 60 * SECOND, HOUR = 60 * MINUTE, DAY = 24 * HOUR;
// The units a length of time is told in, longest first. Weeks are the longest: a year reads "52w".
/** @type {[unit: string, length: number][]} */
const UNITS = [["w", 7 * DAY], ["d", DAY], ["h", HOUR], ["min", MINUTE], ["s", SECOND]];

// The time spent in each status, in the order the issue first entered them. `spans` are its stays, oldest first; the
// one still running lasts until `now`, and its status is the `current` one. A status entered several times counts
// once, for all its stays.
/**
 * @param {StatusSpan[]} spans
 * @param {number} now
 * @returns {StatusTime[]}
 */
export function timeInStatuses(spans, now) {
  /** @type {Map<string, StatusTime>} */
  const times = new Map();
  for (const { state, startedAt, endedAt } of spans) {
    // A status deleted since has no name to show.
    if (!state) continue;
    const ms = Math.max(0, (endedAt ? Date.parse(endedAt) : now) - Date.parse(startedAt));
    times.set(state.id, { state, ms: (times.get(state.id)?.ms ?? 0) + ms, current: !endedAt });
  }
  return [...times.values()];
}

// A length of time in its longest unit, rounded: "5s", "44min", "3d".
/** @param {number} ms */
export function timeLabel(ms) {
  const [unit, length] = UNITS.find(([, length]) => ms >= length) ?? UNITS[UNITS.length - 1];
  return `${Math.round(ms / length)}${unit}`;
}

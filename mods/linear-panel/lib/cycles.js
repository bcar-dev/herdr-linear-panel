// A team's cycles in time: the one running, those to come and those ended, and how each is worded.
// Pure rules with no calls to Herdr, so node can test them (tests/unit).

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The word for where a cycle stands: the next one only is "Upcoming", the last ended only "Previous".
/** @type {Partial<Record<CycleTense, string>>} */
export const TENSES = { current: "Current", next: "Upcoming", previous: "Previous" };

// The icon of a cycle where it stands: a ring open at the top around a play triangle for the current one, a closed
// ring for the next, a dashed ring for later ones, and for those ended a ring open at its bottom right, where a check
// sits.
/** @type {Record<CycleTense, string>} */
const ICONS = {
  current: "view-cycle", next: "cycle", future: "cycle-future", previous: "cycle-past", past: "cycle-past",
};

/** @param {CycleTense} tense */
export const cycleIcon = (tense) => ICONS[tense];

// A cycle's own name, else "Cycle" and its number.
/** @param {Cycle} cycle */
export const cycleName = (cycle) => cycle.name || `Cycle ${cycle.number}`;

// Where a cycle stands at `now` among `cycles`, its team's.
/**
 * @param {Cycle} cycle
 * @param {Cycle[]} cycles
 * @param {number} now
 * @returns {CycleTense}
 */
export function tense(cycle, cycles, now) {
  const starts = Date.parse(cycle.startsAt), ends = Date.parse(cycle.endsAt);
  if (starts > now) {
    return cycles.some((other) => now < Date.parse(other.startsAt) && Date.parse(other.startsAt) < starts) ? "future"
      : "next";
  }
  if (ends > now) return "current";
  return cycles.some((other) => ends < Date.parse(other.endsAt) && Date.parse(other.endsAt) <= now) ? "past"
    : "previous";
}

// The cycles an issue can be moved to, in the picker's order: the current one and those to come in order, then the
// previous one. Older ones are left out: they were the previous one when the team's cycles were read.
/**
 * @param {Cycle[]} cycles
 * @param {number} now
 */
export function pickable(cycles, now) {
  const listed = [...cycles].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  /** @param {CycleTense[]} tenses */
  const only = (tenses) => listed.filter((cycle) => tenses.includes(tense(cycle, cycles, now)));
  return [...only(["current", "next", "future"]), ...only(["previous"])];
}

// "Nov 10 - Nov 23": its first and last days, in the computer's time zone. A cycle ends at the midnight that starts
// the day after its last.
/** @param {Cycle} cycle */
export function span(cycle) {
  /** @param {number} time */
  const day = (time) => `${MONTHS[new Date(time).getMonth()]} ${new Date(time).getDate()}`;
  return `${day(Date.parse(cycle.startsAt))} - ${day(Date.parse(cycle.endsAt) - 1)}`;
}

// What the picker shows after a cycle's name: its days, then where it stands, when it has a word.
/**
 * @param {Cycle} cycle
 * @param {Cycle[]} cycles
 * @param {number} now
 */
export const cycleNote = (cycle, cycles, now) =>
  [span(cycle), TENSES[tense(cycle, cycles, now)]].filter(Boolean).join(" · ");

// The weekdays from today to the cycle's end, today included: on its last Friday, 1 is left.
/**
 * @param {Cycle} cycle
 * @param {number} now
 */
export function weekdaysLeft(cycle, now) {
  const ends = Date.parse(cycle.endsAt), day = new Date(now);
  day.setHours(0, 0, 0, 0);
  let left = 0;
  for (; day.getTime() < ends; day.setDate(day.getDate() + 1)) if (day.getDay() % 6 !== 0) left++;
  return left;
}

// The pie of a share done (0 to 1), drawn as a started status's (icons/status-started-1 to -7): an empty ring at
// nothing, a disc with a check once all is done.
/** @param {number} done */
export const progressIcon = (done) => (done <= 0 ? "status-unstarted" : done >= 1 ? "status-completed"
  : `status-started-${Math.min(7, Math.max(1, Math.round(done * 8)))}`);

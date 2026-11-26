// A team's cycles in time: the one running, those to come and those ended, and how each is worded.
// Pure rules with no calls to Herdr, so node can test them (tests/unit)

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PIE_STEPS = 8, SATURDAY = 6, SUNDAY = 0;

/** Where a cycle stands among its team's: `NEXT` is the first to come, `PREVIOUS` the last ended */
export const CycleTense = Object.freeze({
  CURRENT: "current", FUTURE: "future", NEXT: "next", PAST: "past", PREVIOUS: "previous",
});
/** @typedef {typeof CycleTense[keyof typeof CycleTense]} CycleTense */

// The next cycle only is "Upcoming", the last ended only "Previous"
/** @type {Partial<Record<CycleTense, string>>} */
export const TENSES = {
  [CycleTense.CURRENT]: "Current", [CycleTense.NEXT]: "Upcoming", [CycleTense.PREVIOUS]: "Previous",
};

/** @type {Record<CycleTense, string>} */
const ICONS = {
  [CycleTense.CURRENT]: "view-cycle", [CycleTense.FUTURE]: "cycle-future", [CycleTense.NEXT]: "cycle",
  [CycleTense.PAST]: "cycle-past", [CycleTense.PREVIOUS]: "cycle-past",
};

/** @param {CycleTense} tense */
export const cycleIcon = (tense) => ICONS[tense];

/** @param {Cycle} cycle */
export const cycleName = (cycle) => cycle.name || `Cycle ${cycle.number}`;

/**
 * @param {Cycle} cycle
 * @param {Cycle[]} cycles
 * @param {number} now
 * @returns {CycleTense}
 */
export function tense(cycle, cycles, now) {
  const starts = Date.parse(cycle.startsAt), ends = Date.parse(cycle.endsAt);
  if (starts > now) {
    return cycles.some((other) => now < Date.parse(other.startsAt) && Date.parse(other.startsAt) < starts)
      ? CycleTense.FUTURE : CycleTense.NEXT;
  }
  if (ends > now) return CycleTense.CURRENT;
  return cycles.some((other) => ends < Date.parse(other.endsAt) && Date.parse(other.endsAt) <= now) ? CycleTense.PAST
    : CycleTense.PREVIOUS;
}

// In the picker's order: the current one and those to come in order, then the previous one. Older ones are left out:
// they were the previous one when the team's cycles were read
/**
 * @param {Cycle[]} cycles
 * @param {number} now
 */
export function pickable(cycles, now) {
  const listed = [...cycles].sort((first, second) => Date.parse(first.startsAt) - Date.parse(second.startsAt));
  /** @param {CycleTense[]} tenses */
  const only = (tenses) => listed.filter((cycle) => tenses.includes(tense(cycle, cycles, now)));
  return [...only([CycleTense.CURRENT, CycleTense.NEXT, CycleTense.FUTURE]), ...only([CycleTense.PREVIOUS])];
}

// "Nov 10 - Nov 23", in the computer's time zone. A cycle ends at the midnight that starts the day after its last
/** @param {Cycle} cycle */
export function span(cycle) {
  /** @param {number} time */
  const day = (time) => `${MONTHS[new Date(time)
    .getMonth()]} ${new Date(time)
    .getDate()}`;
  return `${day(Date.parse(cycle.startsAt))} - ${day(Date.parse(cycle.endsAt) - 1)}`;
}

/**
 * @param {Cycle} cycle
 * @param {Cycle[]} cycles
 * @param {number} now
 */
export const cycleNote = (cycle, cycles, now) =>
  [span(cycle), TENSES[tense(cycle, cycles, now)]].filter(Boolean)
    .join(" · ");

// Today is included: on its last Friday, 1 is left
/**
 * @param {Cycle} cycle
 * @param {number} now
 */
export function weekdaysLeft(cycle, now) {
  const ends = Date.parse(cycle.endsAt), day = new Date(now);
  day.setHours(0, 0, 0, 0);
  let left = 0;
  for (; day.getTime() < ends; day.setDate(day.getDate() + 1)) {
    if (day.getDay() !== SUNDAY && day.getDay() !== SATURDAY) left++;
  }
  return left;
}

// The pie filled by one eighth, by two, up to seven
export const PIE_ICONS = [
  "status-started-1", "status-started-2", "status-started-3", "status-started-4", "status-started-5",
  "status-started-6", "status-started-7",
];

// `fraction` is 0 to 1
/** @param {number} fraction */
export const pieIcon = (fraction) =>
  PIE_ICONS[Math.min(PIE_STEPS - 1, Math.max(1, Math.round(fraction * PIE_STEPS))) - 1];

/** @param {number} done 0 to 1 */
export const progressIcon = (done) => (done <= 0 ? "status-unstarted" : done >= 1 ? "status-completed"
  : pieIcon(done));

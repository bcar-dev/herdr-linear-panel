// What the panel keeps in its storage between runs: its settings (a view, an ordering), and what the tracker tells
// that hardly ever changes (a team's states, members and cycles, the labels). Storage can be missing or full: nothing
// here may throw

// Bumped with any change to what is kept: older entries are never read
const PREFIX = "cache.v1.";

// `fallback` is what a missing or corrupt entry answers, and its shape (a list or a record) is the one required
/**
 * @param {string} name
 * @param {unknown} [fallback]
 * @returns {any}
 */
export function recall(name, fallback = null) {
  try {
    const value = JSON.parse(localStorage.getItem(`${PREFIX}${name}`) ?? "null");
    if (fallback === null) return value;
    return value !== null && typeof value === "object" && Array.isArray(value) === Array.isArray(fallback)
      ? value : fallback;
  } catch {
    return fallback;
  }
}

/** @param {string} name */
export function readSetting(name) {
  try {
    return localStorage.getItem(name);
  } catch {
    return null;
  }
}

/**
 * @param {string} name
 * @param {string} value
 */
export function keepSetting(name, value) {
  try {
    localStorage.setItem(name, value);
  } catch {
    // Not kept: the next run starts from the default
  }
}

/**
 * @param {string} name
 * @param {unknown} value
 */
export function keep(name, value) {
  try {
    localStorage.setItem(`${PREFIX}${name}`, JSON.stringify(value));
  } catch {
    // Not kept: the next run asks again
  }
}

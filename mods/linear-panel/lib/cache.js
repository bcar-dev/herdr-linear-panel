// What the tracker tells that hardly ever changes (a team's states, members and cycles, the labels), kept in the
// panel's storage between runs. Storage can be missing or full: nothing here may throw

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

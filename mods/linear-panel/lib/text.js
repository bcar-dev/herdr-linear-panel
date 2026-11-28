// Texts: how two compare, and how a message names issues and errors

// Orders two texts as `sort` wants, 0 when they are equal. `<` and `>` compare code units: the mod runtime has no ICU
/**
 * @param {string} first
 * @param {string} second
 */
export const compareText = (first, second) => (first < second ? -1 : first > second ? 1 : 0);

/** @param {Pick<Issue, "identifier">[]} issues */
export const issuesName = ([first, ...rest]) => (first && !rest.length ? first.identifier
  : `${rest.length + (first ? 1 : 0)} issues`);

/** @param {any} error */
export const message = (error) => String(error?.message ?? error);

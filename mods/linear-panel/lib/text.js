// Places in a text. Pure, so node can test it (tests/unit)

// Orders two texts as `sort` wants, 0 when they are equal. `<` and `>` compare code units: the mod runtime has no ICU
/**
 * @param {string} first
 * @param {string} second
 */
export const compareText = (first, second) => (first < second ? -1 : first > second ? 1 : 0);

/** @param {any} error */
export const message = (error) => String(error?.message ?? error);

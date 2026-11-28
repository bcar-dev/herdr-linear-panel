// Text the tracker sends is typed by other people: a title can carry an escape sequence that rewrites the clipboard,
// the terminal's title or what the screen shows. Everything is cleaned once, where an answer is read

/* eslint-disable no-control-regex -- these match terminal escape sequences, which are control characters */
const CONTROLS = /[\u0000-\u001f\u007f-\u009f]/g;
const CONTROLS_KEEPING_BREAKS = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g;
const CSI_SEQUENCE = /(?:\u001b\[|\u009b)[0-?]*[ -/]*[@-~]/g;
const LINE_BREAKS = /[\n\t]/g;
const OTHER_ESCAPE = /\u001b[@-_]/g;
const STRING_BODY = /[^\u0007\u001b\u009c]*/;
const STRING_END = /(?:\u0007|\u001b\\|\u009c)?/;
const STRING_START = /(?:\u001b[\]PX^_]|[\u0090\u0098\u009d\u009e\u009f])/;
const STRING_SEQUENCE = new RegExp(STRING_START.source + STRING_BODY.source + STRING_END.source, "g");
/* eslint-enable no-control-regex */

// The fields that are prose (Markdown): they keep their line breaks and tabs
const PROSE_FIELDS = ["body", "description"];

/**
 * @param {string} text
 * @param {boolean} [keepBreaks] newlines and tabs stay, for prose; else each becomes a space
 */
export function cleanText(text, keepBreaks = false) {
  const withoutSequences = text.replace(STRING_SEQUENCE, "")
    .replace(CSI_SEQUENCE, "")
    .replace(OTHER_ESCAPE, "");
  return keepBreaks
    ? withoutSequences.replace(CONTROLS_KEEPING_BREAKS, "")
    : withoutSequences.replace(LINE_BREAKS, " ")
      .replace(CONTROLS, "");
}

/**
 * Every string of an answer, however deep, cleaned
 * @param {any} value
 * @param {string} [field] the name the value has in its parent
 * @returns {any}
 */
export function cleanAnswer(value, field = "") {
  if (typeof value === "string") return cleanText(value, PROSE_FIELDS.includes(field));
  if (Array.isArray(value)) return value.map((item) => cleanAnswer(item, field));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .map(([name, item]) => [name, cleanAnswer(item, name)]));
  }
  return value;
}

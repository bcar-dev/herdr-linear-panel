// Markdown split into the headings, which the mod draws itself, and the text between them. Pure, so node can test it
// (tests/unit)
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const HEADING = /^ {0,3}(#{1,6}) +(\S.*?)(?: +#+)? *$/;
export const HEADING_SIZES_PX = { 1: 22, 2: 19, 3: 17, 4: 15, 5: 14, 6: 13 };
export const TEXT_SIZE_PX = 13;

/** @typedef {{ heading: { level: number, text: string } } | { markdown: string }} MarkdownBlock */

// A heading is an ATX line (# to ######, then a space) outside a fenced code block. A block leaves out the blank lines
// around it
/**
 * @param {string} source
 * @returns {MarkdownBlock[]}
 */
export function markdownBlocks(source) {
  /** @type {MarkdownBlock[]} */
  const blocks = [];
  /** @type {string[]} */
  let lines = [];
  let fence = "";
  const flush = () => {
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    if (lines.length) blocks.push({ markdown: lines.join("\n") });
    lines = [];
  };
  for (const text of source.split("\n")) {
    const mark = FENCE.exec(text)?.[1];
    if (mark && !fence) fence = mark[0];
    else if (mark && mark[0] === fence) fence = "";
    const found = fence || mark ? null : HEADING.exec(text);
    if (found) {
      flush();
      blocks.push({ heading: { level: found[1].length, text: found[2] } });
    } else lines.push(text);
  }
  flush();
  return blocks;
}

// A Markdown text as the page draws it: the text between headings in a TextView, each heading in a size of its own,
// because a TextView draws every heading nearly as small as the text
import { div } from "gpui-kit";
import { v_flex, TextView } from "gpui-base";
import { openLink } from "../tracker.js";
import { HEADING_SIZES_PX, TEXT_SIZE_PX, markdownBlocks } from "../lib/markdown.js";

const HEADING_GAP_BOTTOM_PX = 4;
const HEADING_GAP_TOP_PX = 10;

// The first block keeps `id`, the others take their place after it
/**
 * @param {string} id
 * @param {string} source
 * @param {boolean} [selectable]
 */
export function markdownView(id, source, selectable = false) {
  const view = (/** @type {string} */ key, /** @type {string} */ text) => {
    const shown = TextView.markdown(key, text)
      .on_link_click((url) => { openLink(url); });
    return selectable ? shown.selectable() : shown;
  };
  return v_flex()
    .w_full()
    .children(markdownBlocks(source)
      .map((block, index) => {
        const key = index === 0 ? id : `${id}-${index}`;
        if ("markdown" in block) return div()
          .w_full()
          .child(view(key, block.markdown)
            .text_size(TEXT_SIZE_PX));
        const { level, text } = block.heading;
        return div()
          .pt(index === 0 ? 0 : HEADING_GAP_TOP_PX)
          .pb(HEADING_GAP_BOTTOM_PX)
          .child(view(key, text)
            .text_size(HEADING_SIZES_PX[/** @type {keyof typeof HEADING_SIZES_PX} */ (level)])
            .font_bold());
      }));
}

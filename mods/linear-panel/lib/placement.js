// Where popups and tooltips go, in window coordinates
import { Side } from "../enums.js";

const FIT_CHARACTER_WIDTH_PX = 7, OVERFLOW_TOLERANCE_PX = 8;
export const CONTROL_GAP_PX = 6, EDGE_MARGIN_PX = 4, SUBMENU_GAP_PX = 12, TEXT_CHARACTER_WIDTH_PX = 6;

// What the text takes, reckoned from its length: the font has no widths to ask. `characterPx` is the average width of
// one character, that of the cards' text unless the caller gives its own
/**
 * @param {string} text
 * @param {number} [characterPx]
 */
export const textWidth = (text, characterPx = TEXT_CHARACTER_WIDTH_PX) => characterPx * text.length;

/**
 * @param {Bounds | undefined} frame
 * @param {number} width
 */
const rightLimit = (frame, width) => (frame ? frame.x + frame.width - width - EDGE_MARGIN_PX : Infinity);

// Pulled back inside the panel when it would pass its right or bottom edge: Herdr cuts a popup at the window's edge and
// does not move it. Beside a menu entry, the popup opens on its right when there is room, else on its left when the
// window has room there, as a submenu does, its first row level with the entry. Without a point or a frame it opens at
// the pointer
/**
 * @param {Where} where
 * @param {number} width
 * @param {number} height
 */
export function place({ point, frame, beside, below, above, narrow, gap, lead } = {}, width, height) {
  if (above) {
    return { x: Math.max(frame?.x ?? 0, Math.min(above.x, rightLimit(frame, width))),
      y: Math.max(frame?.y ?? 0, above.y - (gap ?? CONTROL_GAP_PX) - height) };
  }
  if (below) {
    const bottom = frame ? frame.y + frame.height : Infinity;
    return { x: Math.max(frame?.x ?? 0, Math.min(below.x, rightLimit(frame, width))),
      y: Math.max(frame?.y ?? 0, Math.min(below.y + below.height + (gap ?? CONTROL_GAP_PX), bottom - height)) };
  }
  if (beside && narrow) {
    const bottom = frame ? frame.y + frame.height : Infinity;
    return { x: Math.min(beside.x + beside.width + SUBMENU_GAP_PX, rightLimit(frame, width)),
      y: Math.max(frame?.y ?? 0, Math.min(beside.y - CONTROL_GAP_PX, bottom - height)) };
  }
  if (beside) {
    const apart = gap ?? SUBMENU_GAP_PX, right = beside.x + beside.width + apart, left = beside.x - apart - width;
    const fits = !frame || right + width <= frame.x + frame.width + OVERFLOW_TOLERANCE_PX;
    const bottom = frame ? frame.y + frame.height : Infinity;
    const top = lead === undefined ? beside.y - CONTROL_GAP_PX : beside.y + beside.height / 2 - lead;
    return { x: fits || left < 0 ? right : left, y: Math.max(frame?.y ?? 0, Math.min(top, bottom - height)) };
  }
  if (!point || !frame) return "pointer";
  return {
    x: Math.max(frame.x, Math.min(point.x, frame.x + frame.width - width)),
    y: Math.max(frame.y, Math.min(point.y, frame.y + frame.height - height)),
  };
}

// `room` is the space below and above the control, `extra` what the popup has besides its rows, `row` the height of
// one. A scrolling list never shows fewer than `least` rows
/**
 * @param {{ below: number, above: number }} room
 * @param {number} rows
 * @param {number} row
 * @param {number} extra
 * @param {number} least
 * @returns {{ side: Exclude<Side, "right">, visible: number }}
 */
export function listFit({ below, above }, rows, row, extra, least) {
  const full = extra + rows * row;
  if (full <= below) return { side: Side.BELOW, visible: rows };
  if (full <= above) return { side: Side.ABOVE, visible: rows };
  const side = below >= above ? Side.BELOW : Side.ABOVE;
  const fits = Math.floor((Math.max(below, above) - extra) / row);
  return { side, visible: Math.min(rows, Math.max(Math.min(least, rows), fits)) };
}

// `control` and `frame` are in window pixels, `height` in the pixels of a style
/**
 * @param {Bounds} control
 * @param {Bounds} frame
 * @param {number} height
 * @param {number} zoom
 * @returns {Exclude<Side, "right">}
 */
export function sideOf(control, frame, height, zoom) {
  const below = (frame.y + frame.height - control.y - control.height) / zoom - CONTROL_GAP_PX;
  const above = (control.y - frame.y) / zoom - CONTROL_GAP_PX;
  return height <= below || (height > above && below >= above) ? Side.BELOW : Side.ABOVE;
}

/**
 * @param {string[]} labels
 * @param {number} besideLabelPx
 * @param {number} minPx
 * @param {number} maxPx
 */
export const fitWidth = (labels, besideLabelPx, minPx, maxPx) =>
  Math.max(minPx, Math.min(maxPx,
    besideLabelPx + Math.max(0, ...labels.map((label) => textWidth(label, FIT_CHARACTER_WIDTH_PX)))));

/**
 * @param {Bounds} bounds
 * @param {number} zoom
 * @returns {Bounds}
 */
export const unzoomed = ({ x, y, width, height }, zoom) =>
  ({ x: x / zoom, y: y / zoom, width: width / zoom, height: height / zoom });

// Down the panel: `top` is an offset from the panel's top, `bottom` from its bottom (when asked by `side`, or when the
// panel has no room under the control). Across: `center` is from the panel's left edge, or the tooltip sits against
// `left` or `right` when, centered, it would pass that edge
/**
 * @param {Bounds} bounds
 * @param {Bounds} frame
 * @param {Side} side
 * @param {{ width: number, height: number }} size
 * @returns {TipSpot}
 */
export function tipSpot(bounds, frame, side, { width, height }) {
  if (side === Side.RIGHT) {
    const room = frame.width - width - EDGE_MARGIN_PX, middle = bounds.y - frame.y + bounds.height / 2;
    return { left: Math.max(EDGE_MARGIN_PX, Math.min(bounds.x + bounds.width + CONTROL_GAP_PX - frame.x, room)),
      top: Math.max(EDGE_MARGIN_PX, Math.min(middle - height / 2, frame.height - height - EDGE_MARGIN_PX)) };
  }
  const middle = bounds.x + bounds.width / 2 - frame.x, bottom = frame.y + frame.height;
  const across = middle - width / 2 < EDGE_MARGIN_PX ? { left: EDGE_MARGIN_PX }
    : middle + width / 2 > frame.width - EDGE_MARGIN_PX ? { right: EDGE_MARGIN_PX }
    : { center: middle };
  const above = side === Side.ABOVE || bounds.y + bounds.height + CONTROL_GAP_PX + height + EDGE_MARGIN_PX > bottom;
  const along = above
    ? { bottom: bottom - bounds.y + CONTROL_GAP_PX }
    : { top: bounds.y - frame.y + bounds.height + CONTROL_GAP_PX };
  return { ...across, ...along };
}

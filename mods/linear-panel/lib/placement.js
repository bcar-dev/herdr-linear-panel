// Where popups and tooltips go. Pure geometry in window coordinates, so node can test it (tests/unit).

// Where a popup of that size opens: at the press, pulled back inside the panel when it would pass its right or bottom
// edge. Herdr cuts a popup at the window's edge and does not move it. `where` is { point, frame }: the press and the
// panel. With `beside` (a menu entry's bounds) the popup opens next to that entry instead, on the right when there is
// room, as a submenu does. Without a point or a frame it opens at the pointer.
/**
 * @param {Where} where
 * @param {number} width
 * @param {number} height
 */
export function place({ point, frame, beside } = {}, width, height) {
  if (beside) {
    const right = beside.x + beside.width + 12, fits = !frame || right + width <= frame.x + frame.width + 8;
    const bottom = frame ? frame.y + frame.height : Infinity;
    return { x: fits ? right : beside.x - 12 - width,
      y: Math.max(frame?.y ?? 0, Math.min(beside.y - 6, bottom - height)) };
  }
  if (!point || !frame) return "pointer";
  return {
    x: Math.max(frame.x, Math.min(point.x, frame.x + frame.width - width)),
    y: Math.max(frame.y, Math.min(point.y, frame.y + frame.height - height)),
  };
}

// A width for a popup whose rows show one of those labels beside `rest` px of other things, kept between `least` and
// `most`. A mod cannot measure text: a character counts for 7 px, a little over what the menus' type takes.
/**
 * @param {string[]} labels
 * @param {number} rest
 * @param {number} least
 * @param {number} most
 */
export const fitWidth = (labels, rest, least, most) =>
  Math.max(least, Math.min(most, rest + 7 * Math.max(0, ...labels.map((label) => label.length))));

// Bounds told in window pixels, in the pixels of a style at that `zoom`.
/**
 * @param {Bounds} bounds
 * @param {number} zoom
 * @returns {Bounds}
 */
export const unzoomed = ({ x, y, width, height }, zoom) =>
  ({ x: x / zoom, y: y / zoom, width: width / zoom, height: height / zoom });

// How far a tooltip stays from the panel's edges, and from its control.
const EDGE = 4, GAP = 6;

// Where a tooltip of that size hangs inside the panel. Down the panel: under the control, as an offset from the
// panel's `top`, or above it, as an offset from its `bottom`, when asked (`side`) or when the panel has no room under
// the control. Across the panel: around the control's middle (`center`, from the panel's left edge), or against the
// panel's `left` or `right` edge when, centered, it would pass that edge.
/**
 * @param {Bounds} bounds
 * @param {Bounds} frame
 * @param {Tip["side"]} side
 * @param {{ width: number, height: number }} size
 * @returns {TipSpot}
 */
export function tipSpot(bounds, frame, side, { width, height }) {
  const middle = bounds.x + bounds.width / 2 - frame.x, bottom = frame.y + frame.height;
  const across = middle - width / 2 < EDGE ? { left: EDGE }
    : middle + width / 2 > frame.width - EDGE ? { right: EDGE }
      : { center: middle };
  const above = side === "above" || bounds.y + bounds.height + GAP + height + EDGE > bottom;
  const along = above ? { bottom: bottom - bounds.y + GAP } : { top: bounds.y - frame.y + bounds.height + GAP };
  return { ...across, ...along };
}

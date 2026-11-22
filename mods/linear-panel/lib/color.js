// Colors as the API and the theme give them: "#rrggbb", with an optional alpha. Pure, so node can test it (tests/unit).

// A brighter shade of the same color: every channel is raised by that share (0.32 makes it 32 % stronger) and stops
// at full strength, so a green becomes a brighter green, not a paler one. The alpha is kept. A value that is not such
// a color comes back as it is.
/**
 * @param {Color} color
 * @param {number} share
 * @returns {Color}
 */
export function brighten(color, share) {
  const parts = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i.exec(color);
  if (!parts) return color;
  const brighter = parts.slice(1, 4).map((channel) =>
    Math.min(255, Math.round(parseInt(channel, 16) * (1 + share))).toString(16).padStart(2, "0"));
  return /** @type {Color} */ (`#${brighter.join("")}${parts[4] ?? ""}`);
}

// Whether a color is a dark one, by its lightness as the eye weighs red, green and blue. A value that is not such a
// color counts as dark.
/** @param {Color} color */
export function isDark(color) {
  const parts = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(color);
  if (!parts) return true;
  const [red, green, blue] = parts.slice(1).map((channel) => parseInt(channel, 16));
  return 0.299 * red + 0.587 * green + 0.114 * blue < 128;
}

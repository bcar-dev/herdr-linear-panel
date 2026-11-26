// Colors as the API and the theme give them: "#rrggbb", with an optional alpha. Pure, so node can test it (tests/unit)

const ALPHA_FROM = 7;
const CHANNEL_MAX = 255;
const DARK_LUMA_BELOW = 128;
const HEX_CHANNEL_CHARS = 2;
const HEX_RADIX = 16;
const LUMA_BLUE = 0.114;
const LUMA_GREEN = 0.587;
const LUMA_RED = 0.299;

// `alpha` is 0 to 1; any alpha the color has is replaced. A value that is not a color comes back as it is
/**
 * @param {Color} color
 * @param {number} alpha
 * @returns {Color}
 */
export function withAlpha(color, alpha) {
  if (!/^#[0-9a-f]{6}/i.test(color)) return color;
  const channel = Math.round(alpha * CHANNEL_MAX)
    .toString(HEX_RADIX)
    .padStart(HEX_CHANNEL_CHARS, "0");
  return /** @type {Color} */ (`${color.slice(0, ALPHA_FROM)}${channel}`);
}

// `share` raises every channel (0.32 makes it 32 % stronger), capped at full strength; the alpha is kept. A value that
// is not a color comes back as it is
/**
 * @param {Color} color
 * @param {number} share
 * @returns {Color}
 */
export function brighten(color, share) {
  const parts = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i.exec(color);
  if (!parts) return color;
  const brighter = parts.slice(1, 4)
    .map((channel) =>
      Math.min(CHANNEL_MAX, Math.round(parseInt(channel, HEX_RADIX) * (1 + share)))
        .toString(HEX_RADIX)
        .padStart(HEX_CHANNEL_CHARS, "0"));
  return /** @type {Color} */ (`#${brighter.join("")}${parts[4] ?? ""}`);
}

// By lightness as the eye weighs red, green and blue. A value that is not a color counts as dark
/** @param {Color} color */
export function isDark(color) {
  const parts = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(color);
  if (!parts) return true;
  const [red, green, blue] = parts.slice(1)
    .map((channel) => parseInt(channel, HEX_RADIX));
  return LUMA_RED * red + LUMA_GREEN * green + LUMA_BLUE * blue < DARK_LUMA_BELOW;
}

// `share` of the second (0 is the first, 1 the second). The first color's alpha is kept. A value that is not a color
// gives back the first
/**
 * @param {Color} from
 * @param {Color} to
 * @param {number} share
 * @returns {Color}
 */
export function mix(from, to, share) {
  const read = (/** @type {string} */ color) =>
    /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(color)
      ?.slice(1, 4)
      .map((channel) => parseInt(channel, HEX_RADIX));
  const start = read(from), end = read(to);
  if (!start || !end) return from;
  const mixed = start.map((channel, i) => Math.round(channel + (end[i] - channel) * share)
    .toString(HEX_RADIX)
    .padStart(HEX_CHANNEL_CHARS, "0"));
  return /** @type {Color} */ (`#${mixed.join("")}${from.slice(ALPHA_FROM)}`);
}

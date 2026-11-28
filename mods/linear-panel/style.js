// The mod's scale of sizes, and the theme's colors named by what they mean. Every text size, corner and gap comes from
// here (tests/unit/style.test.js holds it). A corner of half its control's height is `rounded_full()` instead

export const Text = Object.freeze({ CAPTION: 11, SMALL: 12, BODY: 13, LARGE: 14, TITLE: 16, HEADLINE: 18 });

export const Space = Object.freeze({ XXS: 2, XS: 4, S: 6, M: 8, L: 12, XL: 16, XXL: 24 });

// By what they round: a small box, a chip, a menu's row, a control, a card, a box around a popup or the panel
export const Radius = Object.freeze({ MARK: 4, CHIP: 5, ROW: 6, CONTROL: 7, CARD: 8, BOX: 10 });

export const Height = Object.freeze({ ICON_BUTTON: 26, ROW: 28, MENU_ROW: 31, FIELD: 32, BUTTON: 36 });

// The theme as the parts draw with it: Herdr's colors, and the same ones by purpose. Read through, not copied: the
// tests' stand-in theme is a Proxy, which a copy leaves empty
/**
 * @param {Record<string, string>} colors as Herdr gives them
 * @returns {Theme}
 */
export const withPurposes = (colors) => Object.assign(Object.create(colors), {
  danger: colors.ansi1, success: colors.done,
});

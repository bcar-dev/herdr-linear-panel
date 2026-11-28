import js from "@eslint/js";

const HERDR = { console: "readonly", fetch: "readonly", localStorage: "readonly" };
const NODE = { console: "readonly", process: "readonly", URL: "readonly", setImmediate: "readonly" };

export default [
  { ignores: ["node_modules/", "**/*.d.ts"] },
  js.configs.recommended,
  { files: ["mods/**/*.js"], languageOptions: { globals: HERDR } },
  { files: ["tests/**/*.js"], languageOptions: { globals: NODE } },
  {
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      // Names say what they hold: no single letters, and none of the usual abbreviations (`cx` for a context)
      "id-denylist": ["error", "cb", "cx", "ctx", "el", "err", "evt", "fn", "idx", "msg", "tmp", "val"],
      "id-length": ["error", { min: 2, properties: "never", exceptions: ["_", "x", "y"] }],
      indent: ["error", 2, { MemberExpression: 1, SwitchCase: 1, flatTernaryExpressions: true }],
      "newline-per-chained-call": ["error", { ignoreChainWithDepth: 1 }],
      "no-inline-comments": ["error", { ignorePattern: "^\\* @(type|param) " }],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
      // A known limit is a `shortcut:` comment that says when to lift it, not a bare marker
      "no-warning-comments": ["error", { terms: ["todo", "fixme", "hack", "xxx"], location: "start" }],
    },
  },
];

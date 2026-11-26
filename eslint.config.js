import js from "@eslint/js";

const HERDR = { console: "readonly", fetch: "readonly", localStorage: "readonly" };
const NODE = { console: "readonly", process: "readonly", URL: "readonly", setImmediate: "readonly" };

export default [
  { ignores: ["node_modules/", "**/*.d.ts"] },
  js.configs.recommended,
  { files: ["mods/**/*.js"], languageOptions: { globals: HERDR } },
  { files: ["tests/**/*.js"], languageOptions: { globals: NODE } },
  {
    rules: {
      indent: ["error", 2, { MemberExpression: 1, SwitchCase: 1, flatTernaryExpressions: true }],
      "newline-per-chained-call": ["error", { ignoreChainWithDepth: 1 }],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
    },
  },
];

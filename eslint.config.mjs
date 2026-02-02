import globals from "globals";

const browserGlobals = globals.browser;
const nodeGlobals = globals.node;

const baseRules = {
  "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
  "no-undef": "error",
  "no-var": "error",
  "prefer-const": "error",
};

export default [
  {
    ignores: ["node_modules/**", "docs/dashboard/**"],
  },
  {
    files: ["app/**", "docs/**"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        ...browserGlobals,
      },
    },
    rules: baseRules,
  },
  {
    files: ["server/**", "tests/**"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script",
      globals: {
        ...nodeGlobals,
      },
    },
    rules: baseRules,
  },
  {
    files: ["tests/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...nodeGlobals,
      },
    },
    rules: baseRules,
  },
];

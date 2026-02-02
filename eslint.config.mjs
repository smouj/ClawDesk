const browserGlobals = {
  window: "readonly",
  document: "readonly",
  navigator: "readonly",
  alert: "readonly",
  confirm: "readonly",
  fetch: "readonly",
  EventSource: "readonly",
  performance: "readonly",
  URL: "readonly",
  Blob: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
};

const nodeGlobals = {
  require: "readonly",
  module: "readonly",
  process: "readonly",
  __dirname: "readonly",
  __filename: "readonly",
  console: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  URL: "readonly",
};

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
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...browserGlobals,
        ...nodeGlobals,
      },
    },
    rules: baseRules,
  },
  {
    files: ["**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...browserGlobals,
        ...nodeGlobals,
      },
    },
    rules: baseRules,
  },
];

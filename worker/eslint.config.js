import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        // Workers runtime globals.
        console: "readonly",
        crypto: "readonly",
        Response: "readonly",
        Request: "readonly",
        Headers: "readonly",
        URL: "readonly",
        WebSocketPair: "readonly",
        Date: "readonly",
        Promise: "readonly",
        Set: "readonly",
        Map: "readonly",
        Math: "readonly",
        JSON: "readonly",
        Uint8Array: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
  },
];

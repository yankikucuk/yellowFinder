import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";

/**
 * Flat ESLint configuration: Node rules for the main process and tests,
 * browser rules for the renderer and the page scripts.
 */
export default [
  { ignores: ["dist/**", "release/**", "node_modules/**"] },
  js.configs.recommended,
  ...pluginVue.configs["flat/recommended"],
  {
    files: ["src/main/**/*.js", "scripts/**/*.mjs", "test/**/*.js", "test/**/*.mjs", "vite.config.js", "eslint.config.js"],
    languageOptions: { globals: { ...globals.node } }
  },
  {
    files: ["src/shared/**/*.js"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } }
  },
  {
    files: ["src/main/scanner/page-scripts.js"],
    languageOptions: { globals: { ...globals.browser } }
  },
  {
    files: ["src/preload/**/*.cjs"],
    languageOptions: { sourceType: "commonjs", globals: { ...globals.node } }
  },
  {
    files: ["src/renderer/**/*.{js,vue}"],
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/max-attributes-per-line": "off",
      "vue/singleline-html-element-content-newline": "off",
      "vue/html-self-closing": "off"
    }
  }
];

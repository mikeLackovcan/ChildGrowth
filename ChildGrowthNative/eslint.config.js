// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Generated bundles and standalone Node maintenance scripts have their own
    // runtime assumptions and are checked by their dedicated test commands.
    ignores: ["dist/*", "backend/functions/lib/**", "scripts/**", "release/**"],
    rules: {
      // React Native's Animated API intentionally stores mutable animation
      // objects in refs and reads them while constructing animated styles.
      // The React Compiler advisory rules currently treat that supported RN
      // pattern, and common native subscription setup, as hard errors.
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
    },
  }
]);

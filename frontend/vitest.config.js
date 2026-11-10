/**
 * @file vitest.config.js
 * @description Vitest test runner configuration for frontend unit test suites.
 * Sets the root directory to repository root and defines test discovery patterns
 * matching `tests/unit-testing/frontend/**\/*.test.js`.
 */

import { defineConfig } from "vitest/config";

export default defineConfig({
  root: "..",
  test: {
    include: ["tests/unit-testing/frontend/**/*.test.js"],
  },
});

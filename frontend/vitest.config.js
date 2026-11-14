/**
 * @file vitest.config.js
 * @description Vitest test runner configuration for frontend story unit tests and workflow regressions.
 * Sets the root directory to repository root and defines test discovery patterns
 * matching the story tests and the separate frontend regression directory.
 */

process.env.FORCE_COLOR = "1";

import { defineConfig } from "vitest/config";

const jestLikeReporter = {
  onFinished(files = []) {
    for (const file of files) {
      const hasFailure = file.result?.state === "fail" || (file.tasks && file.tasks.some(t => t.result?.state === "fail"));
      const badge = hasFailure
        ? "\x1b[30m\x1b[41m FAIL \x1b[0m"
        : "\x1b[30m\x1b[42m PASS \x1b[0m";
      console.log(`\n ${badge}  ${file.name}\n`);
    }
  },
};

export default defineConfig({
  root: "..",
  esbuild: { jsx: "automatic" },
  test: {
    include: ["tests/unit-testing/frontend/**/*.test.js", "frontend/tests/regression/**/*.test.js"],
    reporters: ["default", jestLikeReporter],
  },
});

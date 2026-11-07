import { defineConfig } from "vitest/config";

export default defineConfig({
  root: "..",
  test: {
    include: ["tests/unit-testing/frontend/**/*.test.js"],
  },
});

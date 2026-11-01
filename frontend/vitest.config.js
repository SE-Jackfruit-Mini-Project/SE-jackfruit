import { defineConfig } from "vitest/config";

export default defineConfig({
  root: "..",
  test: {
    include: ["tests/unit-testing/frontend/US-008-donor-eligibility.test.js"],
  },
});

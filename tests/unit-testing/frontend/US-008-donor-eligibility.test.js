/**
 * @file US-008-donor-eligibility.test.js
 * @description Frontend unit test suite for US-008: Donor Eligibility Information.
 * Verifies that the eligibility page exposes the configured appointment booking checks.
 */

import { describe, expect, test } from "vitest";
import { getEligibilityState } from "../../../frontend/src/eligibility/eligibility-content.js";

describe("US-008 donor eligibility information", () => {
  test("shows the configured appointment booking criteria", () => {
    const eligibility = getEligibilityState();

    expect(eligibility.available).toBe(true);
    expect(eligibility.content).toContain("18 to 65 years old");
    expect(eligibility.content).toContain("at least 45 kg");
    expect(eligibility.content).toContain("4 calendar months");
    expect(eligibility.content).toContain("3 calendar months");
    expect(eligibility.content).toContain("do not determine whether donating blood is medically safe");
  });
});

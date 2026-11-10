/**
 * @file US-008-donor-eligibility.test.js
 * @description Frontend unit test suite for US-008: Donor Eligibility Information.
 * Verifies that the eligibility content state helper returns `{ available: false, content: null }`
 * until official approved medical guidance is published by the blood bank.
 */

import { describe, expect, test } from "vitest";
import { getEligibilityState } from "../../../frontend/src/eligibility/eligibility-content.js";

describe("US-008 donor eligibility information", () => {
  test("shows unavailable guidance until approved content exists", () => {
    expect(getEligibilityState()).toEqual({ available: false, content: null });
  });
});

import { describe, expect, test } from "vitest";
import { getEligibilityState } from "../../../frontend/src/eligibility/eligibility-content.js";

describe("US-008 donor eligibility information", () => {
  test("shows the safe unavailable state until guidance is approved", () => {
    expect(getEligibilityState()).toEqual({ available: false, content: null });
  });
});

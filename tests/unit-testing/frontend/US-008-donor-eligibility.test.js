import { describe, expect, test } from "vitest";
import { getEligibilityState } from "../../../frontend/src/eligibility/eligibility-content.js";

describe("US-008 donor eligibility information", () => {
  test("shows unavailable guidance until approved content exists", () => {
    expect(getEligibilityState()).toEqual({ available: false, content: null });
  });
});

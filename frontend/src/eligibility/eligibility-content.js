/**
 * @file eligibility-content.js
 * @description Donor eligibility content module. Holds official medical guidance state and exposes
 * an inquiry helper for donor eligibility pages in compliance with US-008.
 */

// Eligibility rules remain a requirements decision. Do not invent medical rules here.
export const approvedEligibilityInformation = null;

/**
 * Evaluates the current state of approved donor eligibility guidance.
 *
 * @function getEligibilityState
 * @returns {{available: boolean, content: string | null}} Object indicating whether guidance is published.
 */
export function getEligibilityState() {
  return approvedEligibilityInformation
    ? { available: true, content: approvedEligibilityInformation }
    : { available: false, content: null };
}

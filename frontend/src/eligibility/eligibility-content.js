/**
 * @file eligibility-content.js
 * @description Donor eligibility content module. Holds official medical guidance state and exposes
 * an inquiry helper for donor eligibility pages in compliance with US-008.
 */

// Project booking checks supplied for appointment booking. These are not clinical guidance.
export const configuredEligibilityInformation =
  "Project booking checks: donors must be 18 to 65 years old (inclusive) and weigh at least 45 kg. After staff or admin records an accepted donation, female donors must wait 4 calendar months and male donors 3 calendar months before booking again. These booking checks do not determine whether donating blood is medically safe; contact blood-bank staff for medical guidance.";

/**
 * Evaluates the current state of approved donor eligibility guidance.
 *
 * @function getEligibilityState
 * @returns {{available: boolean, content: string | null}} Object indicating whether guidance is published.
 */
export function getEligibilityState() {
  return configuredEligibilityInformation
    ? { available: true, content: configuredEligibilityInformation }
    : { available: false, content: null };
}

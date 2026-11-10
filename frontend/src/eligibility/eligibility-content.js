/**
 * @file eligibility-content.js
 * @description Donor eligibility content module. Holds official medical guidance state and exposes
 * an inquiry helper for donor eligibility pages in compliance with US-008.
 */

// Project booking checks supplied for appointment booking. These are not clinical guidance.
export const configuredEligibilityInformation =
  "According to the official Indian guidelines, a donor must be 18 to 65 years old (inclusive), with a weight of at least 45 kg. A donor cannot donate again within 4 months of donating if they are female and similarly 3 months if male. Do not donate if you have very low haemoglobin or other medical conditions. To know more contact your blood-bank staff at +91 1234567890 for clinical eligibility and more guidance.";

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

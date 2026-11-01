// Eligibility criteria remain a requirements decision. Do not invent medical rules here.
export const approvedEligibilityInformation = null;

export function getEligibilityState() {
  return approvedEligibilityInformation
    ? { available: true, content: approvedEligibilityInformation }
    : { available: false, content: null };
}

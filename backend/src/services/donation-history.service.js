/**
 * @file donation-history.service.js
 * @description Service module retrieving historical blood donation records for registered donors,
 * filtering strictly by accepted donations in compliance with US-012.
 */

import { prisma } from "../utils/prisma.js";

/**
 * Retrieves the complete donation history for a specific donor.
 * Requirements: US-012 (FR-024).
 * Returns only accepted donations (`accepted: true`), ordered with the most recent donation first.
 *
 * @async
 * @function getDonationHistory
 * @param {string} donorId - Unique identifier of the donor user.
 * @returns {Promise<Array<{
 *   id: string,
 *   bloodGroup: string,
 *   units: number,
 *   donationDate: Date,
 *   accepted: boolean,
 *   notes: string | null
 * }>>} List of accepted donations recorded for this donor.
 */
export async function getDonationHistory(donorId) {
  return prisma.donation.findMany({
    where: { donorId, accepted: true },
    orderBy: [{ donationDate: "desc" }, { createdAt: "desc" }],
    select: { id: true, bloodGroup: true, units: true, donationDate: true, accepted: true, notes: true },
  });
}

/**
 * @file donor-information.service.js
 * @description Service module providing authorized personnel (e.g. staff and administrators)
 * with read-only access to donor directory and profile summaries in compliance with US-010.
 */

import { prisma } from "../utils/prisma.js";

/**
 * Common field selection projection for donor user summaries, excluding credential hashes.
 */
const donorSummarySelection = {
  id: true,
  fullName: true,
  email: true,
  createdAt: true,
};

/**
 * Lists all registered users with the DONOR role sorted alphabetically by full name.
 * Requirements: US-010 (FR-021).
 *
 * @async
 * @function listDonors
 * @returns {Promise<Array<{id: string, fullName: string, email: string, createdAt: Date}>>}
 *          List of donor summary records.
 */
export async function listDonors() {
  return prisma.user.findMany({
    where: { role: "DONOR" },
    orderBy: { fullName: "asc" },
    select: donorSummarySelection,
  });
}

/**
 * Retrieves specific summary information for a single donor by ID.
 * Requirements: US-010 (FR-021).
 *
 * @async
 * @function getDonorInformation
 * @param {string} donorId - Unique user ID of the donor.
 * @returns {Promise<{id: string, fullName: string, email: string, createdAt: Date} | null>}
 *          Donor summary entity or null if not found.
 */
export async function getDonorInformation(donorId) {
  return prisma.user.findFirst({
    where: { id: donorId, role: "DONOR" },
    select: donorSummarySelection,
  });
}

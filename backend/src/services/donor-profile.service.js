/**
 * @file donor-profile.service.js
 * @description Service module managing donor self-service profile retrieval and updating,
 * ensuring users can only view and mutate their own profile details in compliance with US-003.
 */

import { prisma } from "../utils/prisma.js";

/**
 * Common database projection selecting non-sensitive profile attributes.
 */
const profileSelection = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  createdAt: true,
};

/**
 * Retrieves the profile information for an authenticated donor.
 * Requirements: US-003.
 *
 * @async
 * @function getDonorProfile
 * @param {string} userId - Unique identifier of the authenticated user.
 * @returns {Promise<{id: string, fullName: string, email: string, role: string, createdAt: Date} | null>}
 *          Donor profile or null if user does not exist or is not a donor.
 */
export async function getDonorProfile(userId) {
  return prisma.user.findFirst({
    where: { id: userId, role: "DONOR" },
    select: profileSelection,
  });
}

/**
 * Updates the display name (full name) of an authenticated donor.
 * Requirements: US-003.
 *
 * @async
 * @function updateDonorProfile
 * @param {string} userId - Unique identifier of the authenticated donor user.
 * @param {string} fullName - New full name string.
 * @returns {Promise<Object | null>} Updated donor profile object, or null if update affected 0 rows.
 */
export async function updateDonorProfile(userId, fullName) {
  const result = await prisma.user.updateMany({
    where: { id: userId, role: "DONOR" },
    data: { fullName },
  });

  if (result.count === 0) {
    return null;
  }

  return getDonorProfile(userId);
}

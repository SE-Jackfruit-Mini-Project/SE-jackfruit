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
  dateOfBirth: true,
  gender: true,
  bloodGroup: true,
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
 * Updates the display name and records missing donor eligibility details once.
 * Requirements: US-003.
 *
 * @async
 * @function updateDonorProfile
 * @param {string} userId - Unique identifier of the authenticated donor user.
 * @param {{fullName?: string, dateOfBirth?: string, gender?: string}} values - Donor profile fields to update.
 * @returns {Promise<Object | null>} Updated donor profile object, or null if update affected 0 rows.
 */
export async function updateDonorProfile(userId, values) {
  if (typeof values === "string") values = { fullName: values };
  const current = await prisma.user.findFirst({
    where: { id: userId, role: "DONOR" },
    select: { dateOfBirth: true, gender: true, bloodGroup: true },
  });
  if (!current) return null;

  const changingSavedDate = values.dateOfBirth !== undefined && current.dateOfBirth;
  const changingSavedGender = values.gender !== undefined && current.gender;
  const changingSavedBloodGroup = values.bloodGroup !== undefined && current.bloodGroup;
  if (changingSavedDate || changingSavedGender || changingSavedBloodGroup) {
    const error = new Error("Date of birth, gender, and blood group can only be recorded once.");
    error.status = 400;
    throw error;
  }

  const data = {};
  if (values.fullName !== undefined) data.fullName = values.fullName;
  if (values.dateOfBirth !== undefined) data.dateOfBirth = new Date(`${values.dateOfBirth}T00:00:00.000Z`);
  if (values.gender !== undefined) data.gender = values.gender;
  if (values.bloodGroup !== undefined) data.bloodGroup = values.bloodGroup;
  const result = await prisma.user.updateMany({
    where: {
      id: userId,
      role: "DONOR",
      ...(values.dateOfBirth !== undefined ? { dateOfBirth: null } : {}),
      ...(values.gender !== undefined ? { gender: null } : {}),
      ...(values.bloodGroup !== undefined ? { bloodGroup: null } : {}),
    },
    data,
  });

  if (result.count === 0) {
    if (values.dateOfBirth !== undefined || values.gender !== undefined || values.bloodGroup !== undefined) {
      const error = new Error("Date of birth, gender, and blood group can only be recorded once.");
      error.status = 400;
      throw error;
    }
    return null;
  }

  return getDonorProfile(userId);
}

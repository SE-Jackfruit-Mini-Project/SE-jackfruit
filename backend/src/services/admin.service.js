/**
 * @file admin.service.js
 * @description Administration service module providing administrative controls over
 * user accounts, Role-Based Access Control (RBAC) role assignments, and account lifecycle
 * (activation and deactivation) in compliance with requirements FR-038 through FR-042.
 */

import { z } from "zod";
import { prisma } from "../utils/prisma.js";

/**
 * Zod validation schema defining permissible user roles.
 * Allowed roles: DONOR, HOSPITAL_REQUESTER, STAFF, ADMIN.
 */
const roleSchema = z.enum(["DONOR", "HOSPITAL_REQUESTER", "STAFF", "ADMIN"], {
  errorMap: () => ({ message: "Please select a valid role (DONOR, HOSPITAL_REQUESTER, STAFF, or ADMIN)." }),
});

/**
 * Zod validation schema ensuring account status is explicitly a boolean value.
 */
const statusSchema = z.boolean({
  errorMap: () => ({ message: "Account status must be a boolean (true or false)." }),
});

/**
 * Retrieves all registered user accounts ordered by creation date descending.
 * FR-038 / FR-040: View list of registered system users.
 *
 * @async
 * @function getAllUsers
 * @returns {Promise<Array<{id: string, fullName: string, email: string, role: string, isActive: boolean, createdAt: Date}>>}
 *          List of sanitized user records without sensitive credentials.
 */
export async function getAllUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
}

/**
 * Assigns or updates the role of a target user.
 * FR-039 / FR-041: Assign or update user roles within the permitted set.
 * Enforces business rule: Administrators cannot change their own role (preventing lockout).
 *
 * @async
 * @function updateUserRole
 * @param {string} adminUserId - ID of the authenticated administrator executing the update.
 * @param {string} targetUserId - ID of the user whose role is being modified.
 * @param {string} roleInput - New role to assign ('DONOR' | 'HOSPITAL_REQUESTER' | 'STAFF' | 'ADMIN').
 * @returns {Promise<Object>} Updated user record.
 * @throws {Error} Throws CANNOT_CHANGE_OWN_ROLE if an admin attempts to modify their own role.
 * @throws {Error} Throws USER_NOT_FOUND if target user does not exist.
 * @throws {z.ZodError} If roleInput is not a member of the allowed roles enum.
 */
export async function updateUserRole(adminUserId, targetUserId, roleInput) {
  const newRole = roleSchema.parse(roleInput);

  if (adminUserId === targetUserId) {
    const error = new Error("Administrators cannot change their own role.");
    error.code = "CANNOT_CHANGE_OWN_ROLE";
    throw error;
  }

  const existing = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!existing) {
    const error = new Error("User account not found.");
    error.code = "USER_NOT_FOUND";
    throw error;
  }

  return prisma.user.update({
    where: { id: targetUserId },
    data: { role: newRole },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
}

/**
 * Activates or deactivates a user account.
 * FR-040 / FR-042: Activate or deactivate user accounts.
 * Enforces business rule: Administrators cannot deactivate their own account.
 *
 * @async
 * @function updateUserStatus
 * @param {string} adminUserId - ID of the authenticated administrator executing the status change.
 * @param {string} targetUserId - ID of the user whose account status is being changed.
 * @param {boolean} statusInput - Target activation state (true for active, false for deactivated).
 * @returns {Promise<Object>} Updated user record.
 * @throws {Error} Throws CANNOT_DEACTIVATE_SELF if an admin attempts to deactivate their own account.
 * @throws {Error} Throws USER_NOT_FOUND if the target user account does not exist.
 * @throws {z.ZodError} If statusInput is not a boolean.
 */
export async function updateUserStatus(adminUserId, targetUserId, statusInput) {
  const isActive = statusSchema.parse(statusInput);

  if (adminUserId === targetUserId && !isActive) {
    const error = new Error("Administrators cannot deactivate their own account.");
    error.code = "CANNOT_DEACTIVATE_SELF";
    throw error;
  }

  const existing = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!existing) {
    const error = new Error("User account not found.");
    error.code = "USER_NOT_FOUND";
    throw error;
  }

  return prisma.user.update({
    where: { id: targetUserId },
    data: { isActive },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
}

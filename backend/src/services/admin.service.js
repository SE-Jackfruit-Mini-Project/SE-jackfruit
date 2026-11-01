import { z } from "zod";
import { prisma } from "../utils/prisma.js";

const roleSchema = z.enum(["DONOR", "HOSPITAL_REQUESTER", "STAFF", "ADMIN"], {
  errorMap: () => ({ message: "Please select a valid role (DONOR, HOSPITAL_REQUESTER, STAFF, or ADMIN)." }),
});

const statusSchema = z.boolean({
  errorMap: () => ({ message: "Account status must be a boolean (true or false)." }),
});

// FR-040: View list of registered system users
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

// FR-041: Assign or update user roles within the permitted set
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

// FR-042: Activate or deactivate user accounts
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

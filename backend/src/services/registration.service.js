/**
 * @file registration.service.js
 * @description Donor registration service handling new donor account provisioning, input validation,
 * password hashing with bcrypt (salt rounds = 12), and role assignment enforcement in accordance with US-001.
 */

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../utils/prisma.js";

/**
 * Zod validation schema for public donor registration.
 * Enforces:
 * - fullName: between 1 and 120 characters.
 * - email: valid email syntax up to 254 characters.
 * - password: between 8 and 72 characters (matching bcrypt byte limit).
 */
const registrationSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name.").max(120, "Name is too long."),
  email: z.string().trim().email("Enter a valid email address.").max(254, "Email is too long."),
  dateOfBirth: z.string().date("Enter a valid date of birth."),
  gender: z.enum(["FEMALE", "MALE"], { message: "Choose female or male." }),
  password: z
    .string()
    .min(8, "Use at least 8 characters for your password.")
    .max(72, "Password must be 72 characters or fewer."),
});

/**
 * Registers a new donor user account in the system.
 * Requirements: US-001 (FR-001, FR-002, FR-003, FR-004).
 * 
 * Security & Logic:
 * - Converts email to lowercase for case-insensitive uniqueness.
 * - Salts and hashes passwords with bcrypt (cost factor: 12).
 * - Enforces default role 'DONOR' to prevent privilege escalation via public registration endpoints.
 *
 * @async
 * @function registerDonor
 * @param {Object} input - Registration details.
 * @param {string} input.fullName - Donor's full legal name.
 * @param {string} input.email - Donor's email address.
 * @param {string} input.password - Donor's plaintext password.
 * @returns {Promise<{id: string, fullName: string, email: string, role: string, createdAt: Date}>}
 *          Sanitized user entity without password hash.
 * @throws {z.ZodError} If validation constraints fail.
 */
export async function registerDonor(input) {
  const values = registrationSchema.parse(input);
  const dateOfBirth = new Date(`${values.dateOfBirth}T00:00:00.000Z`);
  if (values.dateOfBirth >= new Date().toISOString().slice(0, 10)) {
    throw new z.ZodError([{
      code: "custom",
      path: ["dateOfBirth"],
      message: "Date of birth must be in the past.",
    }]);
  }
  const email = values.email.toLowerCase();
  const passwordHash = await bcrypt.hash(values.password, 12);

  const user = await prisma.user.create({
    data: {
      fullName: values.fullName,
      email,
      passwordHash,
      dateOfBirth,
      gender: values.gender,
      // Public registration always creates a donor; clients cannot choose privileged roles.
      role: "DONOR",
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      dateOfBirth: true,
      gender: true,
      createdAt: true,
    },
  });

  return user;
}

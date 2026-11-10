/**
 * @file auth.service.js
 * @description Authentication service module handling credential verification, password hashing
 * comparisons via bcrypt, and account status enforcement (active vs. deactivated) in accordance with US-002.
 */

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../utils/prisma.js";

/**
 * Zod validation schema for user login credentials.
 */
const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

/**
 * Authenticates a user using email and password credentials.
 * 
 * Verification Steps:
 * 1. Normalizes email to lowercase.
 * 2. Queries user record in database.
 * 3. Compares plaintext password against bcrypt hash.
 * 4. Checks whether the account has been deactivated by an administrator.
 * 5. Returns a sanitized user session profile.
 *
 * @async
 * @function loginUser
 * @param {Object} input - Login credentials.
 * @param {string} input.email - User email address.
 * @param {string} input.password - User plaintext password.
 * @returns {Promise<{
 *   id: string,
 *   fullName: string,
 *   email: string,
 *   role: string,
 *   isActive: boolean,
 *   createdAt: Date
 * }>} Sanitized user object without password hash.
 * @throws {Error} Throws INVALID_CREDENTIALS if email is not found or password does not match.
 * @throws {Error} Throws ACCOUNT_DEACTIVATED if account isActive flag is false.
 * @throws {z.ZodError} If email or password input fails schema constraints.
 */
export async function loginUser(input) {
  const values = loginSchema.parse(input);
  const email = values.email.toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(values.password, user.passwordHash))) {
    const error = new Error("Invalid email or password.");
    error.code = "INVALID_CREDENTIALS";
    throw error;
  }

  if (user.isActive === false) {
    const error = new Error("Your account has been deactivated. Please contact an administrator.");
    error.code = "ACCOUNT_DEACTIVATED";
    throw error;
  }

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    isActive: user.isActive ?? true,
    createdAt: user.createdAt,
  };
}

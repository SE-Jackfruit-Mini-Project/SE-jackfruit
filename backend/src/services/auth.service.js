import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../utils/prisma.js";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

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

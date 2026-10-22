import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../utils/prisma.js";

const registrationSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name.").max(120, "Name is too long."),
  email: z.string().trim().email("Enter a valid email address.").max(254, "Email is too long."),
  password: z
    .string()
    .min(8, "Use at least 8 characters for your password.")
    .max(72, "Password must be 72 characters or fewer."),
});

export async function registerDonor(input) {
  const values = registrationSchema.parse(input);
  const email = values.email.toLowerCase();
  const passwordHash = await bcrypt.hash(values.password, 12);

  const user = await prisma.user.create({
    data: {
      fullName: values.fullName,
      email,
      passwordHash,
      // Public registration always creates a donor; clients cannot choose privileged roles.
      role: "DONOR",
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}

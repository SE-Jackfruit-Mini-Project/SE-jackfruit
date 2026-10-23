import { z } from "zod";
import { prisma } from "../utils/prisma.js";

const bloodGroups = [
  "A_POSITIVE",
  "A_NEGATIVE",
  "B_POSITIVE",
  "B_NEGATIVE",
  "AB_POSITIVE",
  "AB_NEGATIVE",
  "O_POSITIVE",
  "O_NEGATIVE",
];

const bloodRequestSchema = z.object({
  hospitalName: z
    .string()
    .trim()
    .min(2, "Hospital name must be at least 2 characters.")
    .max(150, "Hospital name is too long."),
  bloodGroup: z.enum(bloodGroups, {
    errorMap: () => ({ message: "Please select a valid blood group." }),
  }),
  units: z.coerce
    .number()
    .int("Units must be a whole number.")
    .positive("Quantity must be at least 1 unit.")
    .max(50, "Quantity cannot exceed 50 units per request."),
  urgency: z.enum(["NORMAL", "URGENT", "EMERGENCY"]).default("NORMAL"),
});

export async function createBloodRequest(userId, input) {
  const values = bloodRequestSchema.parse(input);

  const request = await prisma.bloodRequest.create({
    data: {
      requesterId: userId,
      hospitalName: values.hospitalName,
      bloodGroup: values.bloodGroup,
      units: values.units,
      urgency: values.urgency,
      status: "PENDING",
    },
    select: {
      id: true,
      hospitalName: true,
      bloodGroup: true,
      units: true,
      urgency: true,
      status: true,
      createdAt: true,
    },
  });

  return request;
}

export async function getRequesterRequests(userId) {
  return prisma.bloodRequest.findMany({
    where: { requesterId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      hospitalName: true,
      bloodGroup: true,
      units: true,
      urgency: true,
      status: true,
      createdAt: true,
    },
  });
}

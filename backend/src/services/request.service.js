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

const reviewDecisionSchema = z.enum(["APPROVED", "REJECTED"], {
  errorMap: () => ({ message: "Decision status must be either APPROVED or REJECTED." }),
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

// FR-035: View all blood requests requiring staff processing
export async function getAllRequests(statusFilter) {
  const where = {};
  if (statusFilter && ["PENDING", "APPROVED", "REJECTED", "ALLOCATED"].includes(statusFilter)) {
    where.status = statusFilter;
  }

  return prisma.bloodRequest.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      hospitalName: true,
      bloodGroup: true,
      units: true,
      urgency: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      requester: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
  });
}

// FR-036 & FR-037: Approve or reject a pending request (Atomic & Concurrency-Safe)
export async function reviewBloodRequest(requestId, statusInput) {
  const decision = reviewDecisionSchema.parse(statusInput);

  // Atomic state transition: only transitions if the current state in PostgreSQL is PENDING
  const updateResult = await prisma.bloodRequest.updateMany({
    where: {
      id: requestId,
      status: "PENDING",
    },
    data: {
      status: decision,
    },
  });

  if (updateResult.count === 0) {
    const existing = await prisma.bloodRequest.findUnique({
      where: { id: requestId },
    });

    if (!existing) {
      const error = new Error("Blood request not found.");
      error.code = "REQUEST_NOT_FOUND";
      throw error;
    }

    const error = new Error(
      `Only pending requests can be reviewed. This request is already ${existing.status.toLowerCase()}.`
    );
    error.code = "INVALID_STATUS_TRANSITION";
    throw error;
  }

  return prisma.bloodRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      hospitalName: true,
      bloodGroup: true,
      units: true,
      urgency: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

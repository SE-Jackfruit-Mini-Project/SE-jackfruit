/**
 * @file request.service.js
 * @description Hospital blood request lifecycle service managing blood request submission,
 * requester tracking, staff review queues, and concurrency-safe approval/rejection state transitions
 * in accordance with US-007 (FR-017, FR-018) and US-016 (FR-035, FR-036, FR-037).
 */

import { z } from "zod";
import { prisma } from "../utils/prisma.js";

/**
 * Valid blood group enumerations accepted for hospital requests.
 */
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

/**
 * Zod validation schema for hospital blood requests.
 * Enforces:
 * - hospitalName: between 2 and 150 characters.
 * - bloodGroup: valid enum member.
 * - units: integer between 1 and 50 units.
 * - urgency: NORMAL, URGENT, or EMERGENCY (defaults to NORMAL).
 */
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

/**
 * Zod validation schema for staff review decision (APPROVED or REJECTED).
 */
const reviewDecisionSchema = z.enum(["APPROVED", "REJECTED"], {
  errorMap: () => ({ message: "Decision status must be either APPROVED or REJECTED." }),
});

/**
 * Submits a new blood request on behalf of an authorized hospital requester.
 * Requirements: US-007 (FR-017).
 *
 * @async
 * @function createBloodRequest
 * @param {string} userId - User ID of the hospital requester.
 * @param {Object} input - Blood request attributes matching bloodRequestSchema.
 * @returns {Promise<Object>} Created blood request entity with initial PENDING status.
 */
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

/**
 * Retrieves all blood requests submitted by a specific requester for status tracking.
 * Requirements: US-007 (FR-018).
 *
 * @async
 * @function getRequesterRequests
 * @param {string} userId - User ID of the requester.
 * @returns {Promise<Array<Object>>} List of requester's blood requests ordered newest first.
 */
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

/**
 * Retrieves all blood requests across the system with optional status filtering for staff review.
 * Requirements: US-016 (FR-035).
 *
 * @async
 * @function getAllRequests
 * @param {string} [statusFilter] - Optional status filter ('PENDING' | 'APPROVED' | 'REJECTED' | 'ALLOCATED').
 * @returns {Promise<Array<Object>>} List of blood requests including requester contact details.
 */
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

/**
 * Reviews and updates a pending blood request to either APPROVED or REJECTED.
 * Requirements: US-016 (FR-036, FR-037).
 * 
 * Concurrency Safety:
 * Performs an atomic conditional update matching `status: 'PENDING'`. If another staff member
 * processed the request concurrently, the update count is 0 and an INVALID_STATUS_TRANSITION error is thrown.
 *
 * @async
 * @function reviewBloodRequest
 * @param {string} requestId - Unique identifier of the blood request to review.
 * @param {string} statusInput - Decision ('APPROVED' | 'REJECTED').
 * @returns {Promise<Object>} Updated blood request record.
 * @throws {Error} Throws REQUEST_NOT_FOUND if the request ID does not exist.
 * @throws {Error} Throws INVALID_STATUS_TRANSITION if the request is not currently PENDING.
 * @throws {z.ZodError} If statusInput is neither APPROVED nor REJECTED.
 */
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

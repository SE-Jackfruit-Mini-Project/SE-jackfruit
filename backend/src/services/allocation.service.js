/**
 * @file allocation.service.js
 * @description Blood request allocation service orchestrating the atomic assignment
 * of available blood units to approved hospital blood requests. Implements concurrency-safe
 * double-allocation guards and inventory decrements in accordance with FR-027, FR-028, and FR-037.
 */

import { z } from "zod";
import { prisma } from "../utils/prisma.js";
import { InventoryError, allocateUnits } from "./inventory.service.js";

/**
 * Zod schema validating incoming request ID parameter.
 */
const requestIdSchema = z.string({ required_error: "Request ID is required." }).trim().min(1, "Request ID is required.");

/**
 * Common projection object for querying blood request details.
 */
const requestSelect = {
  id: true,
  hospitalName: true,
  bloodGroup: true,
  units: true,
  urgency: true,
  createdAt: true,
};

/**
 * Retrieves all blood requests in APPROVED status waiting for unit allocation,
 * sorted chronologically (oldest requests first / FIFO basis).
 * Requirement: FR-037.
 *
 * @async
 * @function getApprovedRequests
 * @returns {Promise<Array<{id: string, hospitalName: string, bloodGroup: string, units: number, urgency: string, createdAt: Date}>>}
 *          List of approved requests ready for allocation.
 */
export async function getApprovedRequests() {
  return prisma.bloodRequest.findMany({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "asc" },
    select: requestSelect,
  });
}

/**
 * Allocates inventory blood units to a specific approved blood request.
 * Requirements: FR-027, FR-028, FR-037.
 * 
 * Atomicity & Concurrency:
 * 1. Executes inside a Prisma interactive transaction ($transaction).
 * 2. Verifies request existence and APPROVED status.
 * 3. Conditionally claims the request (APPROVED -> ALLOCATED) using `updateMany`
 *    with row count verification, preventing race conditions or double allocations.
 * 4. Invokes `allocateUnits()` to decrement inventory and create an audit movement log.
 * 5. If inventory is insufficient or request status has shifted, rolls back entire transaction.
 *
 * @async
 * @function allocateRequest
 * @param {string} actorId - ID of the staff member or system actor performing the allocation.
 * @param {string} requestId - Unique identifier of the blood request to be allocated.
 * @returns {Promise<{
 *   requestId: string,
 *   status: string,
 *   bloodGroup: string,
 *   unitsAllocated: number,
 *   inventory: { availableUnits: number, status: string }
 * }>} Allocation confirmation payload including updated inventory status.
 * @throws {InventoryError} 404 if request not found, 409 if not approved or already allocated,
 *                          or 409 if inventory is insufficient.
 */
export async function allocateRequest(actorId, requestId) {
  const id = requestIdSchema.parse(requestId);

  return prisma.$transaction(async (tx) => {
    const bloodRequest = await tx.bloodRequest.findUnique({ where: { id }, select: { ...requestSelect, status: true } });
    if (!bloodRequest) {
      throw new InventoryError(404, "Blood request not found.");
    }
    if (bloodRequest.status !== "APPROVED") {
      throw new InventoryError(409, "Only approved requests can be allocated.");
    }

    // Claim the request first so a repeated or simultaneous attempt cannot
    // allocate it twice.
    const { count } = await tx.bloodRequest.updateMany({
      where: { id, status: "APPROVED" },
      data: { status: "ALLOCATED" },
    });
    if (count === 0) {
      throw new InventoryError(409, "This request has already been allocated.");
    }

    const inventory = await allocateUnits(tx, {
      bloodGroup: bloodRequest.bloodGroup,
      units: bloodRequest.units,
      actorId,
      referenceId: id,
    });

    return {
      requestId: id,
      status: "ALLOCATED",
      bloodGroup: bloodRequest.bloodGroup,
      unitsAllocated: bloodRequest.units,
      inventory: { availableUnits: inventory.availableUnits, status: inventory.status },
    };
  });
}

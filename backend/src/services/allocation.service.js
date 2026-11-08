import { z } from "zod";
import { prisma } from "../utils/prisma.js";
import { InventoryError, allocateUnits } from "./inventory.service.js";

const requestIdSchema = z.string({ required_error: "Request ID is required." }).trim().min(1, "Request ID is required.");

const requestSelect = {
  id: true,
  hospitalName: true,
  bloodGroup: true,
  units: true,
  urgency: true,
  createdAt: true,
};

// FR-037: approved requests that are waiting for blood units, oldest first.
export async function getApprovedRequests() {
  return prisma.bloodRequest.findMany({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "asc" },
    select: requestSelect,
  });
}

// FR-027, FR-028, FR-037: allocate units to one approved request. The request
// status change and the inventory decrement commit together or not at all.
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

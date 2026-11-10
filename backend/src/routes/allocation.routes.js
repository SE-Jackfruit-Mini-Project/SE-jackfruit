/**
 * @file allocation.routes.js
 * @description Express router exposing endpoints for reviewing approved blood requests
 * waiting for inventory allocation and executing atomic unit allocations.
 * Restricted to STAFF and ADMIN roles.
 */

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { allocateRequest, getApprovedRequests } from "../services/allocation.service.js";

export const allocationRouter = Router();

/**
 * GET /api/allocation/pending
 * FR-037: Approved blood requests awaiting allocation (Staff & Admin only).
 * Retrieves all approved requests waiting for unit fulfillment, ordered FIFO.
 *
 * @name GetApprovedRequests
 * @route {GET} /api/allocation/pending
 * @authentication Requires active session with role STAFF or ADMIN
 * @returns {200} List of approved blood requests
 */
allocationRouter.get("/pending", requireAuth, requireRole("STAFF", "ADMIN"), async (_request, response, next) => {
  try {
    const requests = await getApprovedRequests();
    return response.status(200).json({ requests });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/allocation/:requestId
 * FR-027, FR-028: Allocate units to an approved request (Staff & Admin only).
 * Atomically deducts blood units from inventory and marks request as ALLOCATED.
 *
 * @name AllocateRequest
 * @route {POST} /api/allocation/:requestId
 * @authentication Requires active session with role STAFF or ADMIN
 * @routeparam {string} requestId - Unique identifier of the approved blood request
 * @returns {200} Confirmation payload with remaining inventory levels
 * @returns {400} Invalid request ID format
 * @returns {404} If blood request not found
 * @returns {409} If request is not approved, already allocated, or inventory insufficient
 */
allocationRouter.post("/:requestId", requireAuth, requireRole("STAFF", "ADMIN"), async (request, response, next) => {
  try {
    const allocation = await allocateRequest(request.session.user.id, request.params.requestId);
    return response.status(200).json({
      message: "Blood units allocated to the request.",
      allocation,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return response.status(400).json({ message: error.issues[0]?.message || "Invalid request ID." });
    }
    if (error.name === "InventoryError") {
      return response.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
});

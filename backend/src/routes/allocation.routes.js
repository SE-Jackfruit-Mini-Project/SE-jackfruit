import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { allocateRequest, getApprovedRequests } from "../services/allocation.service.js";

export const allocationRouter = Router();

// FR-037: Approved blood requests awaiting allocation (Staff & Admin only)
allocationRouter.get("/pending", requireAuth, requireRole("STAFF", "ADMIN"), async (_request, response, next) => {
  try {
    const requests = await getApprovedRequests();
    return response.status(200).json({ requests });
  } catch (error) {
    return next(error);
  }
});

// FR-027, FR-028: Allocate units to an approved request (Staff & Admin only)
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

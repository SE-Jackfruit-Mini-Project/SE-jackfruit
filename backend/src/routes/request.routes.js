import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import {
  createBloodRequest,
  getRequesterRequests,
  getAllRequests,
  reviewBloodRequest,
} from "../services/request.service.js";

export const requestRouter = Router();

// FR-030 & FR-031: Submit blood request (Hospital Requester only)
requestRouter.post("/", requireAuth, requireRole("HOSPITAL_REQUESTER"), async (request, response, next) => {
  try {
    const bloodRequest = await createBloodRequest(request.session.user.id, request.body);
    return response.status(201).json({
      message: "Blood request submitted successfully.",
      request: bloodRequest,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return response.status(400).json({
        message: "Please correct the highlighted fields.",
        errors: error.issues.map(({ path, message }) => ({ field: path[0], message })),
      });
    }
    return next(error);
  }
});

// FR-033 & FR-034: View own submitted blood requests and their status
requestRouter.get("/my", requireAuth, requireRole("HOSPITAL_REQUESTER"), async (request, response, next) => {
  try {
    const requests = await getRequesterRequests(request.session.user.id);
    return response.status(200).json({ requests });
  } catch (error) {
    return next(error);
  }
});

// FR-035: Staff view blood requests requiring processing
requestRouter.get("/", requireAuth, requireRole("STAFF", "ADMIN"), async (request, response, next) => {
  try {
    const { status } = request.query;
    const requests = await getAllRequests(status);
    return response.status(200).json({ requests });
  } catch (error) {
    return next(error);
  }
});

// FR-036 & FR-037: Staff approve or reject blood request
requestRouter.patch("/:id/review", requireAuth, requireRole("STAFF", "ADMIN"), async (request, response, next) => {
  try {
    const updatedRequest = await reviewBloodRequest(request.params.id, request.body?.status);
    const actionText = updatedRequest.status === "APPROVED" ? "approved" : "rejected";
    return response.status(200).json({
      message: `Blood request has been ${actionText} successfully.`,
      request: updatedRequest,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return response.status(400).json({
        message: "Invalid review decision. Status must be APPROVED or REJECTED.",
      });
    }
    if (error.code === "REQUEST_NOT_FOUND") {
      return response.status(404).json({ message: error.message });
    }
    if (error.code === "INVALID_STATUS_TRANSITION") {
      return response.status(400).json({ message: error.message });
    }
    return next(error);
  }
});

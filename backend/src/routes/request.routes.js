import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { createBloodRequest, getRequesterRequests } from "../services/request.service.js";

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

/**
 * @file request.routes.js
 * @description Express router for hospital blood requests. Exposes endpoints for hospital requesters
 * to submit requests and monitor request tracking, and for staff/admin to review and approve/reject requests.
 */

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import {
  createBloodRequest,
  getRequesterRequests,
  getAllRequests,
  reviewBloodRequest,
} from "../services/request.service.js";

export const requestRouter = Router();

/**
 * POST /api/requests
 * FR-030 & FR-031: Submit blood request (Hospital Requester only).
 *
 * @name CreateBloodRequest
 * @route {POST} /api/requests
 * @authentication Requires active session with role HOSPITAL_REQUESTER
 * @bodyparam {string} hospitalName - Hospital name (2-150 chars)
 * @bodyparam {string} bloodGroup - Blood group enum
 * @bodyparam {number} units - Requested quantity (1-50 units)
 * @bodyparam {string} [urgency] - Urgency level ('NORMAL' | 'URGENT' | 'EMERGENCY')
 * @returns {201} Created request confirmation with PENDING status
 * @returns {400} Validation errors
 */
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

/**
 * GET /api/requests/my
 * FR-033 & FR-034: View own submitted blood requests and their real-time statuses.
 *
 * @name GetMyBloodRequests
 * @route {GET} /api/requests/my
 * @authentication Requires active session with role HOSPITAL_REQUESTER
 * @returns {200} Array of blood requests submitted by this hospital
 */
requestRouter.get("/my", requireAuth, requireRole("HOSPITAL_REQUESTER"), async (request, response, next) => {
  try {
    const requests = await getRequesterRequests(request.session.user.id);
    return response.status(200).json({ requests });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/requests
 * FR-035: Staff view blood requests requiring processing, with optional status filter.
 *
 * @name GetAllBloodRequests
 * @route {GET} /api/requests
 * @authentication Requires active session with role STAFF or ADMIN
 * @queryparam {string} [status] - Filter by status ('PENDING' | 'APPROVED' | 'REJECTED' | 'ALLOCATED')
 * @returns {200} Array of blood requests matching filter
 */
requestRouter.get("/", requireAuth, requireRole("STAFF", "ADMIN"), async (request, response, next) => {
  try {
    const { status } = request.query;
    const requests = await getAllRequests(status);
    return response.status(200).json({ requests });
  } catch (error) {
    return next(error);
  }
});

/**
 * PATCH /api/requests/:id/review
 * FR-036 & FR-037: Staff approve or reject blood request.
 *
 * @name ReviewBloodRequest
 * @route {PATCH} /api/requests/:id/review
 * @authentication Requires active session with role STAFF or ADMIN
 * @routeparam {string} id - Blood request ID to review
 * @bodyparam {string} status - Review decision ('APPROVED' | 'REJECTED')
 * @returns {200} Success message and updated blood request entity
 * @returns {400} Invalid status decision or request is not currently in PENDING state
 * @returns {404} If request is not found
 */
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

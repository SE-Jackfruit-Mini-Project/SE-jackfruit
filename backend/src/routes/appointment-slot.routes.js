/**
 * @file appointment-slot.routes.js
 * @description Express router for managing appointment slots. Provides staff/admin endpoints
 * for creating new donation slots and general authenticated endpoints for querying slot availability.
 */

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import {
  createAppointmentSlot,
  getAllSlots,
  getAvailableSlots,
  deleteAppointmentSlot,
} from "../services/appointment-slot.service.js";
import { submitOperationProposal } from "../services/operation-approval.service.js";

export const appointmentSlotRouter = Router();

/**
 * POST /api/appointment-slots
 * Creates a new appointment slot for donor scheduling. Restricted to STAFF and ADMIN.
 *
 * @name CreateAppointmentSlot
 * @route {POST} /api/appointment-slots
 * @authentication Requires active session with role STAFF or ADMIN
 * @bodyparam {string} date - Slot date in YYYY-MM-DD format (today or future)
 * @bodyparam {string} startTime - Slot start time in HH:mm 24h format
 * @bodyparam {string} endTime - Slot end time in HH:mm 24h format (after startTime)
 * @bodyparam {number} maxCapacity - Maximum concurrent donor capacity (1 to 100)
 * @returns {201} Created slot record
 * @returns {400} Validation errors on format, past dates, or time sequencing
 * @returns {409} If time window overlaps with an existing slot on the date
 */
appointmentSlotRouter.post(
  "/",
  requireAuth,
  requireRole("STAFF", "ADMIN"),
  async (request, response, next) => {
    try {
      if (request.session.user.role === "STAFF") {
        const approval = await submitOperationProposal(request.session.user.id, "CREATE_SLOT", request.body);
        return response.status(202).json({
          message: "Appointment slot proposal sent to an administrator for approval.",
          approval,
        });
      }
      const slot = await createAppointmentSlot(request.body);
      return response.status(201).json({
        message: "Appointment slot created successfully.",
        slot,
      });
    } catch (error) {
      if (error.name === "ZodError") {
        return response.status(400).json({
          message: "Please correct the highlighted fields.",
          errors: error.issues.map(({ path, message }) => ({
            field: path[0],
            message,
          })),
        });
      }
      if (error.status === 409) {
        return response.status(409).json({
          message: error.message,
        });
      }
      return next(error);
    }
  }
);

appointmentSlotRouter.delete(
  "/:slotId",
  requireAuth,
  requireRole("STAFF", "ADMIN"),
  async (request, response, next) => {
    try {
      if (request.session.user.role === "STAFF") {
        const approval = await submitOperationProposal(request.session.user.id, "DELETE_SLOT", {
          slotId: request.params.slotId,
        });
        return response.status(202).json({
          message: "Slot deletion proposal sent to an administrator for approval.",
          approval,
        });
      }
      const slot = await deleteAppointmentSlot(request.params.slotId);
      return response.json({ message: "Appointment slot deleted.", slotId: slot.id });
    } catch (error) {
      if (error.status === 404 || error.status === 409) {
        return response.status(error.status).json({ message: error.message });
      }
      return next(error);
    }
  },
);

/**
 * GET /api/appointment-slots
 * Retrieves appointment slots. Returns full historical catalog for STAFF and ADMIN,
 * or future available slots only for DONOR and other roles.
 *
 * @name GetAppointmentSlots
 * @route {GET} /api/appointment-slots
 * @authentication Requires authenticated session
 * @returns {200} Array of appointment slots
 */
appointmentSlotRouter.get("/", requireAuth, async (request, response, next) => {
  try {
    const userRole = request.session?.user?.role;
    let slots;
    if (userRole === "STAFF" || userRole === "ADMIN") {
      slots = await getAllSlots();
    } else {
      slots = await getAvailableSlots();
    }
    return response.status(200).json({ slots });
  } catch (error) {
    return next(error);
  }
});

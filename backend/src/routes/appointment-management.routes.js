/**
 * @file appointment-management.routes.js
 * @description Express router for donor appointment self-service management endpoints,
 * allowing authenticated donors to query their scheduled appointments, reschedule to a
 * different slot, or cancel existing reservations. Guarded by `requireAuth` and `requireRole("DONOR")`.
 */

import { Router } from "express";
import {
  requireAuth,
  requireRole,
} from "../middleware/auth.middleware.js";

import {
  getDonorAppointments,
  rescheduleDonorAppointment,
  cancelDonorAppointment,
} from "../services/appointment-management.service.js";

export const appointmentManagementRouter = Router();

// Enforce authentication and DONOR role across all management routes
appointmentManagementRouter.use(requireAuth, requireRole("DONOR"));

/**
 * GET /api/donor-appointments
 * Retrieves all donation appointments belonging to the authenticated donor.
 *
 * @name GetDonorAppointments
 * @route {GET} /api/donor-appointments
 * @authentication Requires active session with role DONOR
 * @returns {200} Array of appointments with embedded slot details
 */
appointmentManagementRouter.get("/", async (request, response, next) => {
  try {
    const appointments = await getDonorAppointments(
      request.session.user.id
    );

    return response.status(200).json({ appointments });
  } catch (error) {
    return next(error);
  }
});

/**
 * PATCH /api/donor-appointments/:appointmentId/reschedule
 * Reschedules a scheduled future appointment to a different available slot.
 *
 * @name RescheduleAppointment
 * @route {PATCH} /api/donor-appointments/:appointmentId/reschedule
 * @authentication Requires active session with role DONOR
 * @routeparam {string} appointmentId - ID of the appointment being rescheduled
 * @bodyparam {string} slotId - ID of the target appointment slot
 * @returns {200} Success message and updated appointment record
 * @returns {400} If validation fails, appointment is past, or slot is identical
 * @returns {404} If appointment or target slot does not exist
 * @returns {409} If target slot is full or has become unavailable
 */
appointmentManagementRouter.patch(
  "/:appointmentId/reschedule",
  async (request, response, next) => {
    try {
      const appointment = await rescheduleDonorAppointment(
        request.session.user.id,
        request.params.appointmentId,
        request.body
      );

      return response.status(200).json({
        message: "Appointment rescheduled successfully.",
        appointment,
      });
    } catch (error) {
      if (error.name === "ZodError") {
        return response.status(400).json({
          message: "Please select a valid appointment slot.",
          errors: error.issues.map(({ path, message }) => ({
            field: path[0],
            message,
          })),
        });
      }

      if (error.status) {
        return response.status(error.status).json({
          message: error.message,
        });
      }

      return next(error);
    }
  }
);

/**
 * PATCH /api/donor-appointments/:appointmentId/cancel
 * Cancels a scheduled future appointment and restores slot capacity.
 *
 * @name CancelAppointment
 * @route {PATCH} /api/donor-appointments/:appointmentId/cancel
 * @authentication Requires active session with role DONOR
 * @routeparam {string} appointmentId - ID of the appointment being cancelled
 * @returns {200} Success message and updated appointment record with CANCELLED status
 * @returns {400} If appointment is already cancelled/completed or in the past
 * @returns {404} If appointment does not exist
 * @returns {409} If concurrency conflicts occur during slot restoration
 */
appointmentManagementRouter.patch(
  "/:appointmentId/cancel",
  async (request, response, next) => {
    try {
      const appointment = await cancelDonorAppointment(
        request.session.user.id,
        request.params.appointmentId
      );

      return response.status(200).json({
        message: "Appointment cancelled successfully.",
        appointment,
      });
    } catch (error) {
      if (error.status) {
        return response.status(error.status).json({
          message: error.message,
        });
      }

      return next(error);
    }
  }
);

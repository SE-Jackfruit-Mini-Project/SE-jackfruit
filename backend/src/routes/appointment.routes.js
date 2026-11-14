/**
 * @file appointment.routes.js
 * @description Express router managing donor appointment booking and donor appointment inquiries.
 * Guarded by `requireAuth` and `requireRole("DONOR")` in compliance with US-004.
 */

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { bookAppointment, getDonorAppointments } from "../services/appointment.service.js";

import { listStaffAppointments, updateStaffAppointmentStatus } from "../services/staff-appointment.service.js";

export const appointmentRouter = Router();

/**
 * POST /api/appointments
 * Books an available appointment slot for the authenticated donor.
 * Requirements: US-004 (AC-3, AC-4, AC-5, AC-6, AC-7).
 *
 * @name BookAppointment
 * @route {POST} /api/appointments
 * @authentication Requires active session with role DONOR
 * @bodyparam {string} slotId - Target slot ID to reserve
 * @bodyparam {string} [notes] - Optional donor notes
 * @returns {201} Booking confirmation and created appointment entity
 * @returns {400} If validation fails, slot is full, or donor already has active booking
 * @returns {404} If selected slot does not exist
 */
appointmentRouter.post("/", requireAuth, requireRole("DONOR"), async (request, response, next) => {
  try {
    const appointment = await bookAppointment(request.session.user.id, request.body);
    return response.status(201).json({
      message: "Your donation appointment has been successfully booked!",
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
});

/**
 * GET /api/appointments/me
 * Retrieves all appointments booked by the authenticated donor.
 *
 * @name GetMyAppointments
 * @route {GET} /api/appointments/me
 * @authentication Requires active session with role DONOR
 * @returns {200} List of donor's booked appointments with slot details
 */
appointmentRouter.get("/me", requireAuth, requireRole("DONOR"), async (request, response, next) => {
  try {
    const appointments = await getDonorAppointments(request.session.user.id);
    return response.status(200).json({ appointments });
  } catch (error) {
    return next(error);
  }
});

// Staff operational management (FR-018); donor self-service routes remain separate.
appointmentRouter.get("/", requireAuth, requireRole("STAFF", "ADMIN"), async (request, response, next) => {
  try { return response.json(await listStaffAppointments(request.query)); }
  catch (error) {
    if (error.name === "ZodError") return response.status(400).json({ message: "Invalid appointment filters." });
    return next(error);
  }
});

appointmentRouter.patch("/:appointmentId/status", requireAuth, requireRole("STAFF", "ADMIN"), async (request, response, next) => {
  try {
    const appointment = await updateStaffAppointmentStatus(request.params.appointmentId, request.body);
    return response.json({ message: "Appointment cancelled.", appointment });
  } catch (error) {
    if (error.name === "ZodError") return response.status(400).json({ message: "A valid appointment status is required." });
    if (error.status) return response.status(error.status).json({ message: error.message });
    return next(error);
  }
});

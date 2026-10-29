import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { bookAppointment, getDonorAppointments } from "../services/appointment.service.js";


export const appointmentRouter = Router();

// Donor books an available appointment slot (AC-3, AC-4, AC-5, AC-6, AC-7)
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

// Donor retrieves own appointment bookings
appointmentRouter.get("/me", requireAuth, requireRole("DONOR"), async (request, response, next) => {
  try {
    const appointments = await getDonorAppointments(request.session.user.id);
    return response.status(200).json({ appointments });
  } catch (error) {
    return next(error);
  }
});

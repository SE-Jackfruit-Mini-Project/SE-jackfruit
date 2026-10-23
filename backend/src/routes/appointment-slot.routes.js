import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import {
  createAppointmentSlot,
  getAllSlots,
  getAvailableSlots,
} from "../services/appointment-slot.service.js";

export const appointmentSlotRouter = Router();

// Staff & Admin: Create a new appointment slot (AC-1, AC-2, AC-3, AC-4, AC-7)
appointmentSlotRouter.post(
  "/",
  requireAuth,
  requireRole("STAFF", "ADMIN"),
  async (request, response, next) => {
    try {
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

// Retrieve appointment slots (AC-6: available slots can be viewed by donors; staff views all)
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

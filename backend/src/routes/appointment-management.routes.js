
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

appointmentManagementRouter.use(requireAuth, requireRole("DONOR"));

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

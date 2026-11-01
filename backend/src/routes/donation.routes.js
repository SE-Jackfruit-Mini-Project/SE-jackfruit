import { Router } from "express";
import {
  requireAuth,
  requireRole,
} from "../middleware/auth.middleware.js";

import {
  getRecentDonations,
  getRegisteredDonors,
  recordCompletedDonation,
} from "../services/donation.service.js";

export const donationRouter = Router();

donationRouter.use(requireAuth, requireRole("STAFF"));

donationRouter.get("/donors", async (_request, response, next) => {
  try {
    const donors = await getRegisteredDonors();

    return response.status(200).json({ donors });
  } catch (error) {
    return next(error);
  }
});

donationRouter.get("/", async (_request, response, next) => {
  try {
    const donations = await getRecentDonations();

    return response.status(200).json({ donations });
  } catch (error) {
    return next(error);
  }
});

donationRouter.post("/", async (request, response, next) => {
  try {
    const result = await recordCompletedDonation(
      request.session.user.id,
      request.body
    );

    return response.status(201).json({
      message: result.inventoryUpdated
        ? "Donation recorded and blood inventory updated."
        : "Donation recorded. Inventory was not changed because the donation was not accepted.",
      ...result,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return response.status(400).json({
        message: "Please check the donation details.",
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

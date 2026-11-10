import { Router } from "express";
import { requireRole } from "../middleware/auth.middleware.js";
import { getDonationHistory } from "../services/donation-history.service.js";

export const donationHistoryRouter = Router();
donationHistoryRouter.use(requireRole("DONOR"));

donationHistoryRouter.get("/", async (request, response, next) => {
  try {
    return response.status(200).json({
      donations: await getDonationHistory(request.session.user.id),
    });
  } catch (error) {
    return next(error);
  }
});

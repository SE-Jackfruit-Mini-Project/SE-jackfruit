/**
 * @file donation-history.routes.js
 * @description Express router for donor donation history. Guarded by `requireRole("DONOR")`
 * in accordance with US-012.
 */

import { Router } from "express";
import { requireRole } from "../middleware/auth.middleware.js";
import { getDonationHistory } from "../services/donation-history.service.js";

export const donationHistoryRouter = Router();
donationHistoryRouter.use(requireRole("DONOR"));

/**
 * GET /api/donations/history
 * Retrieves historical accepted donation records for the authenticated donor.
 * Requirements: US-012.
 *
 * @name GetDonationHistory
 * @route {GET} /api/donations/history
 * @authentication Requires active session with role DONOR
 * @returns {200} Array of completed and accepted donation records
 */
donationHistoryRouter.get("/", async (request, response, next) => {
  try {
    return response.status(200).json({
      donations: await getDonationHistory(request.session.user.id),
    });
  } catch (error) {
    return next(error);
  }
});

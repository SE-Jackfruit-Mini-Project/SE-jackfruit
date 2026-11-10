/**
 * @file donation.routes.js
 * @description Express router for healthcare staff donation recording workflows.
 * Exposes endpoints to retrieve registered donors, view recent donations, and record
 * completed donations. Guarded by `requireAuth` and `requireRole("STAFF", "ADMIN")`.
 */

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

// Restrict all donation management endpoints to healthcare staff and administrators
donationRouter.use(requireAuth, requireRole("STAFF", "ADMIN"));

/**
 * GET /api/donations/donors
 * Retrieves registered donors for intake selection.
 *
 * @name GetRegisteredDonors
 * @route {GET} /api/donations/donors
 * @authentication Requires active session with role STAFF or ADMIN
 * @returns {200} Array of registered donor accounts
 */
donationRouter.get("/donors", async (_request, response, next) => {
  try {
    const donors = await getRegisteredDonors();

    return response.status(200).json({ donors });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/donations
 * Retrieves recent donation logs with donor and recorder staff details.
 *
 * @name GetRecentDonations
 * @route {GET} /api/donations
 * @authentication Requires active session with role STAFF or ADMIN
 * @returns {200} Array of recent donation records
 */
donationRouter.get("/", async (_request, response, next) => {
  try {
    const donations = await getRecentDonations();

    return response.status(200).json({ donations });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/donations
 * Records a completed blood donation and updates inventory if accepted.
 * Requirements: US-011 (FR-022).
 *
 * @name RecordCompletedDonation
 * @route {POST} /api/donations
 * @authentication Requires active session with role STAFF or ADMIN
 * @bodyparam {string} donorId - ID of the registered donor
 * @bodyparam {string} bloodGroup - Blood group enum
 * @bodyparam {number} units - Number of units donated (1-50)
 * @bodyparam {string} donationDate - Date of donation in YYYY-MM-DD
 * @bodyparam {boolean} accepted - Acceptance decision
 * @bodyparam {string} [notes] - Optional clinical notes
 * @returns {201} Donation created and inventory status update
 * @returns {400} Validation errors on date, units, or blood group
 * @returns {404} If selected donor is not found
 */
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

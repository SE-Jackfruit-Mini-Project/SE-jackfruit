/**
 * @file donor-information.routes.js
 * @description Express router for staff/admin inquiries into registered donor summaries.
 * Guarded by `requireRole("STAFF", "ADMIN")` in accordance with US-010.
 */

import { Router } from "express";
import { requireRole } from "../middleware/auth.middleware.js";
import {
  getDonorInformation,
  listDonors,
} from "../services/donor-information.service.js";

export const donorInformationRouter = Router();
donorInformationRouter.use(requireRole("STAFF", "ADMIN"));

/**
 * GET /api/donors
 * Lists all registered donors sorted alphabetically.
 * Requirements: US-010.
 *
 * @name ListDonors
 * @route {GET} /api/donors
 * @authentication Requires active session with role STAFF or ADMIN
 * @returns {200} Array of donor summary records
 */
donorInformationRouter.get("/", async (_request, response, next) => {
  try {
    return response.status(200).json({ donors: await listDonors() });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/donors/:donorId
 * Retrieves detailed summary information for an individual donor.
 * Requirements: US-010.
 *
 * @name GetDonorInformation
 * @route {GET} /api/donors/:donorId
 * @authentication Requires active session with role STAFF or ADMIN
 * @routeparam {string} donorId - Unique user identifier of the donor
 * @returns {200} Donor summary entity
 * @returns {404} If donor is not found
 */
donorInformationRouter.get("/:donorId", async (request, response, next) => {
  try {
    const donor = await getDonorInformation(request.params.donorId);
    if (!donor) {
      return response.status(404).json({ message: "Donor information was not found." });
    }
    return response.status(200).json({ donor });
  } catch (error) {
    return next(error);
  }
});

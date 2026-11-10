/**
 * @file donor-profile.routes.js
 * @description Express router for donor self-service profile retrieval and updates.
 * Guarded by `requireRole("DONOR")` in accordance with US-003.
 */

import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../middleware/auth.middleware.js";
import { getDonorProfile, updateDonorProfile } from "../services/donor-profile.service.js";

export const donorProfileRouter = Router();
donorProfileRouter.use(requireRole("DONOR"));

/**
 * GET /api/profile/me
 * Retrieves the authenticated donor's profile information.
 * Requirements: US-003.
 *
 * @name GetMyProfile
 * @route {GET} /api/profile/me
 * @authentication Requires active session with role DONOR
 * @returns {200} Donor user profile
 * @returns {404} If donor record not found
 */
donorProfileRouter.get("/me", async (request, response, next) => {
  try {
    const profile = await getDonorProfile(request.session.user.id);
    if (!profile) {
      return response.status(404).json({ message: "Donor profile was not found." });
    }
    return response.status(200).json({ user: profile });
  } catch (error) {
    return next(error);
  }
});

/**
 * Validation schema for updating donor full name.
 */
const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name.").max(120, "Name is too long."),
}).strict();

/**
 * PUT /api/profile/me
 * Updates the authenticated donor's full name.
 * Requirements: US-003.
 *
 * @name UpdateMyProfile
 * @route {PUT} /api/profile/me
 * @authentication Requires active session with role DONOR
 * @bodyparam {string} fullName - New full name (1-120 chars)
 * @returns {200} Success message and updated profile
 * @returns {400} Validation errors
 * @returns {404} If donor record not found
 */
donorProfileRouter.put("/me", async (request, response, next) => {
  try {
    const { fullName } = updateProfileSchema.parse(request.body);
    const profile = await updateDonorProfile(request.session.user.id, fullName);
    if (!profile) {
      return response.status(404).json({ message: "Donor profile was not found." });
    }

    request.session.user.fullName = profile.fullName;
    return response.status(200).json({
      message: "Your profile has been updated.",
      user: profile,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return response.status(400).json({
        message: error.issues[0]?.message || "Please check your profile details.",
        errors: error.issues.map(({ path, message }) => ({ field: path[0], message })),
      });
    }
    return next(error);
  }
});

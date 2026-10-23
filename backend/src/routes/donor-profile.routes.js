import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../middleware/auth.middleware.js";
import { getDonorProfile, updateDonorProfile } from "../services/donor-profile.service.js";

export const donorProfileRouter = Router();
donorProfileRouter.use(requireRole("DONOR"));

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

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name.").max(120, "Name is too long."),
}).strict();

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

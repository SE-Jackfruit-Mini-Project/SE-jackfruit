import { Router } from "express";
import { z } from "zod";
import { requireDonor } from "../middleware/require-donor.js";
import { getDonorProfile, updateDonorProfile } from "../services/donor-profile.service.js";

export const donorProfileRouter = Router();
donorProfileRouter.use(requireDonor);

donorProfileRouter.get("/me", async (request, response, next) => {
  try {
    const profile = await getDonorProfile(request.user.id);
    if (!profile) {
      return response.status(404).json({ message: "Donor profile was not found." });
    }
    return response.json({ user: profile });
  } catch (error) {
    return next(error);
  }
});

const updateSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name.").max(120, "Name is too long."),
}).strict();

donorProfileRouter.put("/me", async (request, response, next) => {
  try {
    const { fullName } = updateSchema.parse(request.body);
    const profile = await updateDonorProfile(request.user.id, fullName);
    if (!profile) {
      return response.status(404).json({ message: "Donor profile was not found." });
    }
    return response.json({ message: "Your profile has been updated.", user: profile });
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

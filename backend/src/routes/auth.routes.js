import { Router } from "express";
import { registerDonor } from "../services/registration.service.js";

export const authRouter = Router();

authRouter.post("/register", async (request, response, next) => {
  try {
    const donor = await registerDonor(request.body);
    return response.status(201).json({
      message: "Your donor account has been created.",
      user: donor,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return response.status(400).json({
        message: "Please correct the highlighted fields.",
        errors: error.issues.map(({ path, message }) => ({ field: path[0], message })),
      });
    }

    if (error.code === "P2002") {
      return response.status(409).json({
        message: "An account with this email address already exists.",
      });
    }

    return next(error);
  }
});

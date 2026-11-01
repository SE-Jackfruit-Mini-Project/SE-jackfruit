import { Router } from "express";
import { registerDonor } from "../services/registration.service.js";
import { loginUser } from "../services/auth.service.js";
import { requireAuth } from "../middleware/auth.middleware.js";

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

authRouter.post("/login", async (request, response, next) => {
  try {
    const user = await loginUser(request.body);
    request.session.user = user;
    return response.status(200).json({ message: "You have logged in successfully.", user });
  } catch (error) {
    if (error.name === "ZodError") {
      return response.status(400).json({
        message: "Please correct the highlighted fields.",
        errors: error.issues.map(({ path, message }) => ({ field: path[0], message })),
      });
    }

    if (error.code === "INVALID_CREDENTIALS") {
      return response.status(401).json({ message: error.message });
    }

    if (error.code === "ACCOUNT_DEACTIVATED") {
      return response.status(403).json({ message: error.message });
    }

    return next(error);
  }
});

authRouter.post("/logout", requireAuth, (request, response, next) => {
  request.session.destroy((error) => {
    if (error) return next(error);
    response.clearCookie("sid");
    return response.status(200).json({ message: "You have been logged out." });
  });
});

authRouter.get("/me", requireAuth, (request, response) => {
  return response.status(200).json({ user: request.session.user });
});

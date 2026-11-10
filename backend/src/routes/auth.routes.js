/**
 * @file auth.routes.js
 * @description Express router exposing public authentication endpoints (donor registration,
 * credential login, session destruction/logout) and active session profile retrieval (`/me`).
 */

import { Router } from "express";
import { registerDonor } from "../services/registration.service.js";
import { loginUser } from "../services/auth.service.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const authRouter = Router();

/**
 * POST /api/auth/register
 * Registers a new donor user account.
 * Requirements: US-001.
 *
 * @name RegisterDonor
 * @route {POST} /api/auth/register
 * @bodyparam {string} fullName - Full name (1-120 characters)
 * @bodyparam {string} email - Valid unique email address
 * @bodyparam {string} password - Password (8-72 characters)
 * @returns {201} User created payload
 * @returns {400} Input validation failure
 * @returns {409} Email address already registered
 */
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

/**
 * POST /api/auth/login
 * Verifies email and password credentials, initializes session state.
 * Requirements: US-002.
 *
 * @name LoginUser
 * @route {POST} /api/auth/login
 * @bodyparam {string} email - Registered email address
 * @bodyparam {string} password - Plaintext password
 * @returns {200} Authenticated user profile and session cookie
 * @returns {400} Validation errors
 * @returns {401} Invalid email or password credentials
 * @returns {403} Account deactivated by administrator
 */
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

/**
 * POST /api/auth/logout
 * Destroys current session and clears the session cookie.
 *
 * @name LogoutUser
 * @route {POST} /api/auth/logout
 * @authentication Requires active session
 * @returns {200} Logout confirmation message
 */
authRouter.post("/logout", requireAuth, (request, response, next) => {
  request.session.destroy((error) => {
    if (error) return next(error);
    response.clearCookie("sid");
    return response.status(200).json({ message: "You have been logged out." });
  });
});

/**
 * GET /api/auth/me
 * Retrieves session user profile for active authentication state verification.
 *
 * @name GetCurrentUser
 * @route {GET} /api/auth/me
 * @authentication Requires active session
 * @returns {200} Current session user payload
 * @returns {401} If not authenticated
 */
authRouter.get("/me", requireAuth, (request, response) => {
  return response.status(200).json({ user: request.session.user });
});

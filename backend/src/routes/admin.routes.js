/**
 * @file admin.routes.js
 * @description Express router for administrative user management endpoints, including
 * listing registered users, updating user roles, and toggling account active status.
 * All routes are guarded by `requireAuth` and `requireRole("ADMIN")`.
 */

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import {
  getAllUsers,
  updateUserRole,
  updateUserStatus,
} from "../services/admin.service.js";

export const adminRouter = Router();

// Protect all admin routes: must be authenticated and have ADMIN role
adminRouter.use(requireAuth, requireRole("ADMIN"));

/**
 * GET /api/admin/users
 * FR-038: Admin view users.
 * Retrieves a list of all registered system users ordered by creation date descending.
 *
 * @name GetUsers
 * @route {GET} /api/admin/users
 * @authentication Requires active session with role ADMIN
 * @returns {200} JSON object containing list of sanitized user accounts
 * @returns {401} Unauthorized if session is invalid
 * @returns {403} Forbidden if user role is not ADMIN
 */
adminRouter.get("/users", async (_request, response, next) => {
  try {
    const users = await getAllUsers();
    return response.status(200).json({ users });
  } catch (error) {
    return next(error);
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * FR-039: Admin manage roles.
 * Updates the RBAC role of a target user. Prevents administrator self-demotion.
 *
 * @name UpdateUserRole
 * @route {PATCH} /api/admin/users/:id/role
 * @authentication Requires active session with role ADMIN
 * @routeparam {string} id - Target user's unique identifier
 * @bodyparam {string} role - New role (DONOR, HOSPITAL_REQUESTER, STAFF, ADMIN)
 * @returns {200} Confirmation message and updated user record
 * @returns {400} If role is invalid or admin attempts to modify their own role
 * @returns {404} If target user does not exist
 */
adminRouter.patch("/users/:id/role", async (request, response, next) => {
  try {
    const updatedUser = await updateUserRole(
      request.session.user.id,
      request.params.id,
      request.body?.role
    );
    return response.status(200).json({
      message: `User role has been updated to ${updatedUser.role}.`,
      user: updatedUser,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return response.status(400).json({
        message: "Please select a valid role (DONOR, HOSPITAL_REQUESTER, STAFF, or ADMIN).",
      });
    }
    if (error.code === "USER_NOT_FOUND") {
      return response.status(404).json({ message: error.message });
    }
    if (error.code === "CANNOT_CHANGE_OWN_ROLE") {
      return response.status(400).json({ message: error.message });
    }
    return next(error);
  }
});

/**
 * PATCH /api/admin/users/:id/status
 * FR-040: Admin activate/deactivate accounts.
 * Toggles a target user's active status. Prevents administrator self-deactivation.
 *
 * @name UpdateUserStatus
 * @route {PATCH} /api/admin/users/:id/status
 * @authentication Requires active session with role ADMIN
 * @routeparam {string} id - Target user's unique identifier
 * @bodyparam {boolean} isActive - Desired active flag state
 * @returns {200} Confirmation message and updated user record
 * @returns {400} If status is not boolean or admin attempts to deactivate self
 * @returns {404} If target user does not exist
 */
adminRouter.patch("/users/:id/status", async (request, response, next) => {
  try {
    const updatedUser = await updateUserStatus(
      request.session.user.id,
      request.params.id,
      request.body?.isActive
    );
    const actionText = updatedUser.isActive ? "activated" : "deactivated";
    return response.status(200).json({
      message: `User account has been ${actionText} successfully.`,
      user: updatedUser,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return response.status(400).json({
        message: "Account status must be a boolean (true or false).",
      });
    }
    if (error.code === "USER_NOT_FOUND") {
      return response.status(404).json({ message: error.message });
    }
    if (error.code === "CANNOT_DEACTIVATE_SELF") {
      return response.status(400).json({ message: error.message });
    }
    return next(error);
  }
});

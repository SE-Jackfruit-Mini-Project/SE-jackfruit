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

// FR-040: Admin view users
adminRouter.get("/users", async (_request, response, next) => {
  try {
    const users = await getAllUsers();
    return response.status(200).json({ users });
  } catch (error) {
    return next(error);
  }
});

// FR-041: Admin manage roles
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

// FR-042: Admin activate/deactivate accounts
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

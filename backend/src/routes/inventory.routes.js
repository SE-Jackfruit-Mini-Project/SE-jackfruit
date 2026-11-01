import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { addStock, getAvailability } from "../services/inventory.service.js";

export const inventoryRouter = Router();

// FR-023: Add blood units from non-donation stock additions (Staff & Admin only)
inventoryRouter.post("/stock", requireAuth, requireRole("STAFF"), async (request, response, next) => {
  try {
    const inventory = await addStock(request.session.user.id, request.body);
    return response.status(201).json({
      message: "Blood units added to inventory.",
      inventory,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return response.status(400).json({
        message: "Please correct the highlighted fields.",
        errors: error.issues.map(({ path, message }) => ({ field: path[0], message })),
      });
    }
    return next(error);
  }
});

// FR-025 & FR-026: View blood availability by blood group (read-only)
inventoryRouter.get(
  "/availability",
  requireAuth,
  requireRole("HOSPITAL_REQUESTER", "STAFF", "ADMIN"),
  async (_request, response, next) => {
    try {
      const availability = await getAvailability();
      return response.status(200).json({ availability });
    } catch (error) {
      return next(error);
    }
  }
);

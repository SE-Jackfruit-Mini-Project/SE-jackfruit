import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { addStock, adjustStock, getAvailability } from "../services/inventory.service.js";

export const inventoryRouter = Router();

// FR-023: Add blood units from non-donation stock additions (Staff & Admin only)
inventoryRouter.post("/stock", requireAuth, requireRole("STAFF", "ADMIN"), async (request, response, next) => {
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

// FR-027: Correct stock for a blood group; status follows the quantity (Staff & Admin only)
inventoryRouter.patch("/:bloodGroup", requireAuth, requireRole("STAFF", "ADMIN"), async (request, response, next) => {
  try {
    const inventory = await adjustStock(request.session.user.id, {
      ...request.body,
      bloodGroup: request.params.bloodGroup,
    });
    return response.status(200).json({
      message: "Inventory updated.",
      inventory,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return response.status(400).json({
        message: "Please correct the highlighted fields.",
        errors: error.issues.map(({ path, message }) => ({ field: path[0], message })),
      });
    }
    if (error.name === "InventoryError") {
      return response.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
});

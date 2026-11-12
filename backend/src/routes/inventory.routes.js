/**
 * @file inventory.routes.js
 * @description Express router for inventory operations, including manual stock entries (purchases/transfers),
 * blood availability queries, and staff stock adjustments.
 */

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { addStock, adjustStock, getAvailability } from "../services/inventory.service.js";
import { submitOperationProposal } from "../services/operation-approval.service.js";

export const inventoryRouter = Router();

/**
 * POST /api/inventory/stock
 * FR-023: Add blood units from non-donation stock additions (Staff & Admin only).
 *
 * @name AddStock
 * @route {POST} /api/inventory/stock
 * @authentication Requires active session with role STAFF or ADMIN
 * @bodyparam {string} bloodGroup - Blood group enum
 * @bodyparam {number} units - Number of units to add (1-1000)
 * @bodyparam {string} type - 'PURCHASE' | 'TRANSFER_IN' | 'ADJUSTMENT'
 * @bodyparam {string} [reason] - Optional description
 * @returns {201} Success message and updated inventory status
 * @returns {400} Validation errors
 */
inventoryRouter.post("/stock", requireAuth, requireRole("STAFF", "ADMIN"), async (request, response, next) => {
  try {
    if (request.session.user.role === "STAFF") {
      const approval = await submitOperationProposal(request.session.user.id, "ADD_STOCK", request.body);
      return response.status(202).json({
        message: "Stock addition proposal sent to an administrator for approval.",
        approval,
      });
    }
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

/**
 * GET /api/inventory/availability
 * FR-025 & FR-026: View blood availability across all blood groups (read-only).
 *
 * @name GetAvailability
 * @route {GET} /api/inventory/availability
 * @authentication Requires active session with role HOSPITAL_REQUESTER, STAFF, or ADMIN
 * @returns {200} Catalog of all 8 blood groups with available units and status
 */
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

/**
 * PATCH /api/inventory/:bloodGroup
 * FR-027: Correct stock for a blood group; status updates based on quantity.
 *
 * @name AdjustStock
 * @route {PATCH} /api/inventory/:bloodGroup
 * @authentication Requires active session with role STAFF or ADMIN
 * @routeparam {string} bloodGroup - Blood group to adjust
 * @bodyparam {number} delta - Non-zero positive or negative unit adjustment (-1000 to 1000)
 * @bodyparam {string} reason - Mandatory rationale for audit log (3-200 chars)
 * @returns {200} Success message and updated inventory entity
 * @returns {400} Validation failure
 * @returns {409} If attempting to reduce stock below 0 units
 */
inventoryRouter.patch("/:bloodGroup", requireAuth, requireRole("STAFF", "ADMIN"), async (request, response, next) => {
  try {
    if (request.session.user.role === "STAFF") {
      const approval = await submitOperationProposal(request.session.user.id, "ADJUST_STOCK", {
        ...request.body,
        bloodGroup: request.params.bloodGroup,
      });
      return response.status(202).json({
        message: "Inventory adjustment proposal sent to an administrator for approval.",
        approval,
      });
    }
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

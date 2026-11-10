/**
 * @file inventory.service.js
 * @description Central blood inventory management service providing atomic stock intake,
 * stock adjustments, allocation decrements, availability queries across all blood groups,
 * and automated threshold status synchronization in accordance with US-005, US-006, FR-023, and FR-025-FR-029.
 */

import { z } from "zod";
import { BloodGroup } from "@prisma/client";
import { prisma } from "../utils/prisma.js";

/**
 * Units at or below this level are reported as LOW. The real threshold is TBD
 * in the SRS (inventory alert rules), so this is a placeholder constant.
 */
export const LOW_STOCK_THRESHOLD = 5;

/**
 * Permitted movement types for manual stock addition (excluding direct donor donations, FR-023).
 * Direct donor donations are handled separately in donation.service.js (FR-022).
 */
const stockAdditionTypes = ["PURCHASE", "TRANSFER_IN", "ADJUSTMENT"];

/**
 * Zod validation schema for manual stock intake (addStock).
 */
const addStockSchema = z.object({
  bloodGroup: z.enum(Object.values(BloodGroup), {
    errorMap: () => ({ message: "Please select a valid blood group." }),
  }),
  units: z.coerce
    .number({ invalid_type_error: "Units must be a number." })
    .int("Units must be a whole number.")
    .positive("Units must be at least 1.")
    .max(1000, "Units cannot exceed 1000 per entry."),
  type: z.enum(stockAdditionTypes, {
    errorMap: () => ({ message: "Please select a valid stock addition type." }),
  }),
  reason: z.string().trim().max(200, "Reason is too long.").optional(),
});

/**
 * Computes the availability status enum based on current unit count.
 *
 * @param {number} units - Current quantity of available blood units.
 * @returns {'OUT_OF_STOCK' | 'LOW' | 'AVAILABLE'} Corresponding inventory status.
 */
export function deriveStatus(units) {
  if (units <= 0) return "OUT_OF_STOCK";
  if (units <= LOW_STOCK_THRESHOLD) return "LOW";
  return "AVAILABLE";
}

/**
 * Adds units from a non-donation stock addition (purchase, hospital transfer, initial inventory).
 * Requirements: FR-023.
 * Atomically updates inventory quantity and status, and records an audit InventoryMovement row.
 *
 * @async
 * @function addStock
 * @param {string} actorId - ID of the staff member performing the addition.
 * @param {Object} input - Stock addition payload matching addStockSchema.
 * @returns {Promise<{bloodGroup: string, availableUnits: number, status: string}>} Updated inventory record.
 */
export async function addStock(actorId, input) {
  const values = addStockSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const row = await tx.inventory.upsert({
      where: { bloodGroup: values.bloodGroup },
      create: {
        bloodGroup: values.bloodGroup,
        availableUnits: values.units,
        status: deriveStatus(values.units),
      },
      update: { availableUnits: { increment: values.units } },
    });

    const status = deriveStatus(row.availableUnits);
    const inventory =
      status === row.status
        ? row
        : await tx.inventory.update({ where: { id: row.id }, data: { status } });

    await tx.inventoryMovement.create({
      data: {
        inventoryId: inventory.id,
        type: values.type,
        delta: values.units,
        reason: values.reason || null,
        actorId,
      },
    });

    return {
      bloodGroup: inventory.bloodGroup,
      availableUnits: inventory.availableUnits,
      status: inventory.status,
    };
  });
}

/**
 * Retrieves read-only availability summary across all eight standard blood groups.
 * Requirements: FR-025, FR-026.
 * Groups with no existing inventory record in the database are returned with availableUnits = 0
 * and status = 'OUT_OF_STOCK' to ensure a complete, predictable eight-group catalog.
 *
 * @async
 * @function getAvailability
 * @returns {Promise<Array<{bloodGroup: string, availableUnits: number, status: string}>>}
 *          Availability list containing all 8 blood groups.
 */
export async function getAvailability() {
  const rows = await prisma.inventory.findMany({
    select: { bloodGroup: true, availableUnits: true, status: true },
  });
  const byGroup = new Map(rows.map((row) => [row.bloodGroup, row]));

  return Object.values(BloodGroup).map((bloodGroup) => {
    const row = byGroup.get(bloodGroup);
    return {
      bloodGroup,
      availableUnits: row?.availableUnits ?? 0,
      status: row?.status ?? "OUT_OF_STOCK",
    };
  });
}

/**
 * Custom error class for inventory business rule violations and status codes.
 *
 * @class InventoryError
 * @extends Error
 */
export class InventoryError extends Error {
  /**
   * @param {number} status - HTTP status code (e.g. 404, 409).
   * @param {string} message - Descriptive error message.
   */
  constructor(status, message) {
    super(message);
    this.name = "InventoryError";
    this.status = status;
  }
}

/**
 * Synchronizes the stored status of an inventory row with its current available quantity.
 *
 * @async
 * @function syncStatus
 * @param {Object} tx - Active Prisma transaction client.
 * @param {Object} row - Inventory record to verify.
 * @returns {Promise<Object>} Synchronized inventory row.
 */
export async function syncStatus(tx, row) {
  const status = deriveStatus(row.availableUnits);
  if (status === row.status) return row;
  return tx.inventory.update({ where: { id: row.id }, data: { status } });
}

/**
 * Zod validation schema for manual stock adjustments (increments or decrements).
 */
const adjustStockSchema = z.object({
  bloodGroup: z.enum(Object.values(BloodGroup), {
    errorMap: () => ({ message: "Please select a valid blood group." }),
  }),
  delta: z.coerce
    .number({ invalid_type_error: "Adjustment must be a number." })
    .int("Adjustment must be a whole number.")
    .refine((value) => value !== 0, "Adjustment cannot be zero.")
    .refine((value) => Math.abs(value) <= 1000, "Adjustment cannot exceed 1000 units."),
  reason: z
    .string({ required_error: "A reason is required." })
    .trim()
    .min(3, "A reason is required.")
    .max(200, "Reason is too long."),
});

/**
 * Atomically decrements allocated units from inventory within an external transaction.
 * Requirements: FR-028, FR-029.
 * Must be executed with a transaction client ($transaction) alongside the blood request update.
 * Enforces `availableUnits >= units` in the query condition to prevent negative inventory.
 *
 * @async
 * @function allocateUnits
 * @param {Object} tx - Prisma transaction client.
 * @param {Object} params - Allocation parameters.
 * @param {string} params.bloodGroup - Target blood group.
 * @param {number} params.units - Number of units to allocate.
 * @param {string} params.actorId - ID of actor allocating units.
 * @param {string} params.referenceId - ID of the associated blood request.
 * @returns {Promise<Object>} Updated inventory record.
 * @throws {InventoryError} 409 if available stock is less than required units.
 */
export async function allocateUnits(tx, { bloodGroup, units, actorId, referenceId }) {
  const { count } = await tx.inventory.updateMany({
    where: { bloodGroup, availableUnits: { gte: units } },
    data: { availableUnits: { decrement: units } },
  });
  if (count === 0) {
    throw new InventoryError(409, "Insufficient inventory to allocate the requested units.");
  }

  const row = await tx.inventory.findUnique({ where: { bloodGroup } });
  const inventory = await syncStatus(tx, row);

  await tx.inventoryMovement.create({
    data: {
      inventoryId: inventory.id,
      type: "ALLOCATION",
      delta: -units,
      reason: "Allocated to blood request",
      referenceId,
      actorId,
    },
  });

  return inventory;
}

/**
 * Adjusts inventory stock for corrections, spoiled/expired units, or audits.
 * Requirements: FR-027.
 * For positive adjustments, upserts and increments units.
 * For negative adjustments, conditionally decrements ensuring units cannot drop below zero.
 *
 * @async
 * @function adjustStock
 * @param {string} actorId - ID of the staff member performing the adjustment.
 * @param {Object} input - Adjustment parameters matching adjustStockSchema.
 * @returns {Promise<{bloodGroup: string, availableUnits: number, status: string}>} Updated inventory record.
 * @throws {InventoryError} 409 if attempting to remove more units than currently available.
 */
export async function adjustStock(actorId, input) {
  const values = adjustStockSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    let row;
    if (values.delta > 0) {
      row = await tx.inventory.upsert({
        where: { bloodGroup: values.bloodGroup },
        create: {
          bloodGroup: values.bloodGroup,
          availableUnits: values.delta,
          status: deriveStatus(values.delta),
        },
        update: { availableUnits: { increment: values.delta } },
      });
    } else {
      const { count } = await tx.inventory.updateMany({
        where: { bloodGroup: values.bloodGroup, availableUnits: { gte: -values.delta } },
        data: { availableUnits: { decrement: -values.delta } },
      });
      if (count === 0) {
        throw new InventoryError(409, "Cannot remove more units than are currently in stock.");
      }
      row = await tx.inventory.findUnique({ where: { bloodGroup: values.bloodGroup } });
    }

    const inventory = await syncStatus(tx, row);

    await tx.inventoryMovement.create({
      data: {
        inventoryId: inventory.id,
        type: "ADJUSTMENT",
        delta: values.delta,
        reason: values.reason,
        actorId,
      },
    });

    return {
      bloodGroup: inventory.bloodGroup,
      availableUnits: inventory.availableUnits,
      status: inventory.status,
    };
  });
}

import { z } from "zod";
import { BloodGroup } from "@prisma/client";
import { prisma } from "../utils/prisma.js";

// Units at or below this level are reported as LOW. The real threshold is TBD
// in the SRS (inventory alert rules), so this is a placeholder constant.
export const LOW_STOCK_THRESHOLD = 5;

// Donations are recorded through FR-022, never through this module (FR-023).
const stockAdditionTypes = ["PURCHASE", "TRANSFER_IN", "ADJUSTMENT"];

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

export function deriveStatus(units) {
  if (units <= 0) return "OUT_OF_STOCK";
  if (units <= LOW_STOCK_THRESHOLD) return "LOW";
  return "AVAILABLE";
}

// FR-023: add units from a non-donation stock addition. The quantity update
// and the movement record are written in one transaction.
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

// FR-025, FR-026: read-only availability for every blood group. Groups with no
// inventory row are reported as zero so the view always lists all eight.
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

export class InventoryError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "InventoryError";
    this.status = status;
  }
}

// Brings the stored status in line with the quantity and returns the row.
export async function syncStatus(tx, row) {
  const status = deriveStatus(row.availableUnits);
  if (status === row.status) return row;
  return tx.inventory.update({ where: { id: row.id }, data: { status } });
}

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

// FR-027: staff correct stock (for example expired or damaged units). The status
// is derived from the quantity, so correcting the quantity updates the status.
// A removal is a conditional decrement so stock can never go negative.
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

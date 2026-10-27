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

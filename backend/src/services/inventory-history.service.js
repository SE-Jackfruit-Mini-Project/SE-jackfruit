import { z } from "zod";
import { BloodGroup, InventoryMovementType } from "@prisma/client";
import { prisma } from "../utils/prisma.js";

const querySchema = z.object({
  bloodGroup: z.enum(Object.values(BloodGroup)).optional(),
  type: z.enum(Object.values(InventoryMovementType)).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

// Read-only history of applied changes. Pending proposals are not movements.
export async function listInventoryTransactions(query = {}) {
  const { bloodGroup, type, page, limit } = querySchema.parse(query);
  const rows = await prisma.inventoryMovement.findMany({
    where: { ...(bloodGroup ? { inventory: { bloodGroup } } : {}), ...(type ? { type } : {}) },
    select: {
      id: true, type: true, delta: true, reason: true, referenceId: true, createdAt: true,
      inventory: { select: { bloodGroup: true } },
      actor: { select: { fullName: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * limit, take: limit + 1,
  });
  return { transactions: rows.slice(0, limit), hasMore: rows.length > limit };
}

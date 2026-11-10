/**
 * @file US-005-add-blood-units-inventory-validation.test.js
 * @description Unit test suite for US-005: Add Blood Units with Inventory Validation.
 * Tests inventory threshold calculations (`deriveStatus`: OUT_OF_STOCK, LOW, AVAILABLE),
 * stock additions with audit movement tracking, and input validation bounds on unit counts.
 */

import { jest } from "@jest/globals";

const upsert = jest.fn();
const update = jest.fn();
const movementCreate = jest.fn();
const transaction = jest.fn();

// Mock Prisma client singleton
jest.unstable_mockModule("../../../backend/src/utils/prisma.js", () => ({
  prisma: {
    $transaction: transaction,
  },
}));

const {
  addStock,
  deriveStatus,
} = await import("../../../backend/src/services/inventory.service.js");

beforeEach(() => {
  upsert.mockReset();
  update.mockReset();
  movementCreate.mockReset();
  transaction.mockImplementation(async (callback) =>
    callback({
      inventory: { upsert, update },
      inventoryMovement: { create: movementCreate },
    }),
  );
});

describe("US-005 add blood units with inventory validation", () => {
  test("derives the correct inventory status", () => {
    expect(deriveStatus(0)).toBe("OUT_OF_STOCK");
    expect(deriveStatus(5)).toBe("LOW");
    expect(deriveStatus(6)).toBe("AVAILABLE");
  });

  test("adds valid stock and records the inventory movement", async () => {
    upsert.mockResolvedValue({
      id: "inventory-1",
      bloodGroup: "A_POSITIVE",
      availableUnits: 10,
      status: "AVAILABLE",
    });

    movementCreate.mockResolvedValue({ id: "movement-1" });

    await expect(
      addStock("staff-1", {
        bloodGroup: "A_POSITIVE",
        units: 10,
        type: "PURCHASE",
      }),
    ).resolves.toEqual({
      bloodGroup: "A_POSITIVE",
      availableUnits: 10,
      status: "AVAILABLE",
    });

    expect(movementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        inventoryId: "inventory-1",
        type: "PURCHASE",
        delta: 10,
        actorId: "staff-1",
      }),
    });
  });

  test("rejects invalid quantities", async () => {
    await expect(
      addStock("staff-1", {
        bloodGroup: "A_POSITIVE",
        units: 0,
        type: "PURCHASE",
      }),
    ).rejects.toMatchObject({
      name: "ZodError",
    });

    expect(upsert).not.toHaveBeenCalled();
  });
});

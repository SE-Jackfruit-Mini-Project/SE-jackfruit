/**
 * @file US-005-add-blood-units-inventory-validation.test.js
 * @description Unit test suite for US-005: Add Blood Units with Inventory Validation.
 * Tests inventory threshold calculations (`deriveStatus`: OUT_OF_STOCK, LOW, AVAILABLE),
 * stock additions with audit movement tracking, and input validation bounds on unit counts.
 */

import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

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
const { inventoryRouter } = await import("../../../backend/src/routes/inventory.routes.js");

function appWithUser(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (user) req.session = { user };
    next();
  });
  app.use("/api/v1/inventory", inventoryRouter);
  return app;
}

const stockEntry = { bloodGroup: "A_POSITIVE", units: 10, type: "PURCHASE" };
const postStock = (user, body = stockEntry) =>
  request(appWithUser(user)).post("/api/v1/inventory/stock").send(body);

beforeEach(() => {
  upsert.mockReset();
  update.mockReset();
  movementCreate.mockReset();
  transaction.mockReset();
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

describe("US-005 stock entry endpoint", () => {
  test("requires login and rejects donor and hospital requester roles", async () => {
    expect((await postStock(null)).status).toBe(401);
    for (const role of ["DONOR", "HOSPITAL_REQUESTER"]) {
      expect((await postStock({ id: "user-1", role })).status).toBe(403);
    }
    expect(transaction).not.toHaveBeenCalled();
  });

  test.each(["STAFF", "ADMIN"])("allows %s to add stock and records a movement", async (role) => {
    upsert.mockResolvedValue({ id: "inventory-1", bloodGroup: "A_POSITIVE", availableUnits: 10, status: "AVAILABLE" });
    movementCreate.mockResolvedValue({ id: "movement-1" });

    const response = await postStock({ id: "actor-1", role });
    expect(response.status).toBe(201);
    expect(response.body.inventory).toEqual({ bloodGroup: "A_POSITIVE", availableUnits: 10, status: "AVAILABLE" });
    expect(movementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ inventoryId: "inventory-1", type: "PURCHASE", delta: 10, actorId: "actor-1" }),
    });
  });

  test("reports low stock for a small addition", async () => {
    upsert.mockResolvedValue({ id: "inventory-1", bloodGroup: "A_POSITIVE", availableUnits: 3, status: "LOW" });
    const response = await postStock({ id: "staff-1", role: "STAFF" }, { ...stockEntry, units: 3 });
    expect(response.status).toBe(201);
    expect(response.body.inventory.status).toBe("LOW");
  });

  test.each([
    ["invalid blood group", { ...stockEntry, bloodGroup: "X_POSITIVE" }, "bloodGroup"],
    ["missing blood group", { units: 5, type: "PURCHASE" }, "bloodGroup"],
    ["missing units", { bloodGroup: "A_POSITIVE", type: "PURCHASE" }, "units"],
    ["zero units", { ...stockEntry, units: 0 }, "units"],
    ["negative units", { ...stockEntry, units: -4 }, "units"],
    ["fractional units", { ...stockEntry, units: 1.5 }, "units"],
    ["too many units", { ...stockEntry, units: 1001 }, "units"],
    ["donation entry", { ...stockEntry, type: "DONATION" }, "type"],
    ["missing type", { bloodGroup: "A_POSITIVE", units: 5 }, "type"],
  ])("rejects %s without changing stock", async (_name, body, field) => {
    const response = await postStock({ id: "staff-1", role: "STAFF" }, body);
    expect(response.status).toBe(400);
    expect(response.body.errors.map((error) => error.field)).toContain(field);
    expect(transaction).not.toHaveBeenCalled();
  });
});

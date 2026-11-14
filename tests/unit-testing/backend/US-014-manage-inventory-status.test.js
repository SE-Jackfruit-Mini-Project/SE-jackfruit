/**
 * @file US-014-manage-inventory-status.test.js
 * @description Integration unit test suite for inventory adjustment endpoint (PATCH /api/v1/inventory/:bloodGroup).
 * Verifies:
 * - Authentication (401) and role restriction (403 for non-staff/non-admin)
 * - Positive adjustments incrementing unit counts and updating status
 * - Negative adjustments with underflow prevention (cannot remove more than in stock - 409)
 * - Validation of input parameters (delta, mandatory reason, valid blood group enum)
 * - Concurrency protection preventing negative inventory under simultaneous requests
 */

import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

// In-memory stand-in for the Prisma client; a failed transaction is rolled back.
let rows = new Map();
let movements = [];
const proposalCreate = jest.fn();
const movementFindMany = jest.fn();

const tx = {
  inventory: {
    upsert: async ({ where, create, update }) => {
      const existing = rows.get(where.bloodGroup);
      if (!existing) {
        const row = { id: `inv-${where.bloodGroup}`, ...create };
        rows.set(where.bloodGroup, row);
        return { ...row };
      }
      existing.availableUnits += update.availableUnits.increment;
      return { ...existing };
    },
    updateMany: async ({ where, data }) => {
      const row = rows.get(where.bloodGroup);
      if (!row || row.availableUnits < where.availableUnits.gte) return { count: 0 };
      row.availableUnits -= data.availableUnits.decrement;
      return { count: 1 };
    },
    findUnique: async ({ where }) => ({ ...rows.get(where.bloodGroup) }),
    update: async ({ where, data }) => {
      const row = [...rows.values()].find((r) => r.id === where.id);
      Object.assign(row, data);
      return { ...row };
    },
  },
  inventoryMovement: {
    create: async ({ data }) => {
      movements.push(data);
      return data;
    },
  },
};

jest.unstable_mockModule("../../../backend/src/utils/prisma.js", () => ({
  prisma: {
    operationApproval: { create: proposalCreate },
    inventoryMovement: { findMany: movementFindMany },
    $transaction: async (callback) => {
      const snapshot = new Map([...rows].map(([key, row]) => [key, { ...row }]));
      const movementCount = movements.length;
      try {
        return await callback(tx);
      } catch (error) {
        rows = snapshot;
        movements.length = movementCount;
        throw error;
      }
    },
  },
}));

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

const { listInventoryTransactions } = await import("../../../backend/src/services/inventory-history.service.js");

const staff = { id: "u-staff", role: "STAFF" };
const admin = { id: "u-admin", role: "ADMIN" };
const patch = (user, group, body) => request(appWithUser(user)).patch(`/api/v1/inventory/${group}`).send(body);

beforeEach(() => {
  rows = new Map([["A_POSITIVE", { id: "inv-A", bloodGroup: "A_POSITIVE", availableUnits: 10, status: "AVAILABLE" }]]);
  movements = [];
  proposalCreate.mockReset();
  movementFindMany.mockReset();
});

describe("PATCH /api/v1/inventory/:bloodGroup", () => {
  test("rejects unauthenticated users with 401", async () => {
    expect((await patch(null, "A_POSITIVE", { delta: -1, reason: "Expired" })).status).toBe(401);
  });

  test.each(["DONOR", "HOSPITAL_REQUESTER"])("rejects %s with 403", async (role) => {
    const response = await patch({ id: "u", role }, "A_POSITIVE", { delta: -1, reason: "Expired" });
    expect(response.status).toBe(403);
    expect(rows.get("A_POSITIVE").availableUnits).toBe(10);
  });

  test("staff adjustment remains pending and does not change inventory until approval", async () => {
    proposalCreate.mockResolvedValue({ id: "approval-1", status: "PENDING" });
    const response = await patch(staff, "A_POSITIVE", { delta: -4, reason: "Expired units" });
    expect(response.status).toBe(202);
    expect(response.body.approval.status).toBe("PENDING");
    expect(proposalCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "ADJUST_STOCK", requesterId: staff.id }),
    }));
    expect(rows.get("A_POSITIVE").availableUnits).toBe(10);
    expect(movements).toHaveLength(0);
  });

  test("removing units lowers the quantity and records a movement", async () => {
    const response = await patch(admin, "A_POSITIVE", { delta: -4, reason: "Expired units" });
    expect(response.status).toBe(200);
    expect(response.body.inventory).toEqual({ bloodGroup: "A_POSITIVE", availableUnits: 6, status: "AVAILABLE" });
    expect(movements).toEqual([
      { inventoryId: "inv-A", type: "ADJUSTMENT", delta: -4, reason: "Expired units", actorId: "u-admin" },
    ]);
  });

  test("status follows the quantity down to LOW and OUT_OF_STOCK", async () => {
    const low = await patch(admin, "A_POSITIVE", { delta: -7, reason: "Damaged in storage" });
    expect(low.body.inventory).toMatchObject({ availableUnits: 3, status: "LOW" });
    const out = await patch(admin, "A_POSITIVE", { delta: -3, reason: "Damaged in storage" });
    expect(out.body.inventory).toMatchObject({ availableUnits: 0, status: "OUT_OF_STOCK" });
  });

  test("a positive correction raises the quantity and status", async () => {
    rows.get("A_POSITIVE").availableUnits = 0;
    rows.get("A_POSITIVE").status = "OUT_OF_STOCK";
    const response = await patch(admin, "A_POSITIVE", { delta: 20, reason: "Recount found extra units" });
    expect(response.body.inventory).toMatchObject({ availableUnits: 20, status: "AVAILABLE" });
  });

  test("cannot remove more than is in stock (409) and changes nothing", async () => {
    const response = await patch(admin, "A_POSITIVE", { delta: -11, reason: "Expired units" });
    expect(response.status).toBe(409);
    expect(rows.get("A_POSITIVE").availableUnits).toBe(10);
    expect(movements).toHaveLength(0);
  });

  test("cannot remove units from a group with no inventory row (409)", async () => {
    const response = await patch(admin, "O_NEGATIVE", { delta: -1, reason: "Expired units" });
    expect(response.status).toBe(409);
  });

  test.each([
    ["invalid blood group", "X_POSITIVE", { delta: -1, reason: "Expired" }, "bloodGroup"],
    ["zero adjustment", "A_POSITIVE", { delta: 0, reason: "Expired" }, "delta"],
    ["fractional adjustment", "A_POSITIVE", { delta: 1.5, reason: "Expired" }, "delta"],
    ["oversized adjustment", "A_POSITIVE", { delta: -1001, reason: "Expired" }, "delta"],
    ["missing adjustment", "A_POSITIVE", { reason: "Expired" }, "delta"],
    ["missing reason", "A_POSITIVE", { delta: -1 }, "reason"],
    ["blank reason", "A_POSITIVE", { delta: -1, reason: "  " }, "reason"],
  ])("rejects %s with 400", async (_name, group, body, field) => {
    const response = await patch(admin, group, body);
    expect(response.status).toBe(400);
    expect(response.body.errors.map((e) => e.field)).toContain(field);
    expect(rows.get("A_POSITIVE").availableUnits).toBe(10);
    expect(movements).toHaveLength(0);
  });

  test("simultaneous removals never drive stock negative", async () => {
    const app = appWithUser(admin);
    const send = () => request(app).patch("/api/v1/inventory/A_POSITIVE").send({ delta: -6, reason: "Expired units" });
    const results = await Promise.all([send(), send()]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(rows.get("A_POSITIVE").availableUnits).toBe(4);
  });

  test("inventory history applies validated filters and bounded pagination", async () => {
    movementFindMany.mockResolvedValue([{ id: "m1" }, { id: "m2" }, { id: "m3" }]);
    await expect(listInventoryTransactions({ bloodGroup: "O_NEGATIVE", type: "DONATION", page: "2", limit: "2" }))
      .resolves.toEqual({ transactions: [{ id: "m1" }, { id: "m2" }], hasMore: true });
    expect(movementFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { inventory: { bloodGroup: "O_NEGATIVE" }, type: "DONATION" }, skip: 2, take: 3,
      select: expect.objectContaining({ actor: { select: { fullName: true } } }),
    }));
  });

  test.each([{ bloodGroup: "invalid" }, { type: "PENDING" }, { page: "0" }, { limit: "101" }])("rejects invalid history filters %j", async query => {
    await expect(listInventoryTransactions(query)).rejects.toMatchObject({ name: "ZodError" });
    expect(movementFindMany).not.toHaveBeenCalled();
  });

  test.each(["STAFF", "ADMIN"])("%s can read history without changing stock", async role => {
    movementFindMany.mockResolvedValue([{ id: "m1", delta: -1 }]);
    const response = await request(appWithUser({ id: "u", role })).get("/api/v1/inventory/transactions");
    expect(response.status).toBe(200); expect(response.body.transactions).toEqual([{ id: "m1", delta: -1 }]);
    expect(rows.get("A_POSITIVE").availableUnits).toBe(10); expect(movements).toHaveLength(0);
  });

  test.each([null, "DONOR", "HOSPITAL_REQUESTER"])("denies inventory history for %s", async role => {
    const response = await request(appWithUser(role ? { id: "u", role } : null)).get("/api/v1/inventory/transactions");
    expect(response.status).toBe(role ? 403 : 401); expect(movementFindMany).not.toHaveBeenCalled();
  });

  test("history route returns 400 for invalid filters and propagates read failure", async () => {
    const app = appWithUser(staff);
    app.use((error, _req, res, _next) => res.status(500).json({ message: "Could not read history." }));
    expect((await request(app).get("/api/v1/inventory/transactions?page=0")).status).toBe(400);
    movementFindMany.mockRejectedValueOnce(new Error("offline"));
    expect((await request(app).get("/api/v1/inventory/transactions")).status).toBe(500);
  });

});

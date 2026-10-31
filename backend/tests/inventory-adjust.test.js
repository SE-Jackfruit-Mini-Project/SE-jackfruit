import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

// In-memory stand-in for the Prisma client; a failed transaction is rolled back.
let rows = new Map();
let movements = [];

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

jest.unstable_mockModule("../src/utils/prisma.js", () => ({
  prisma: {
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

const { inventoryRouter } = await import("../src/routes/inventory.routes.js");

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

const staff = { id: "u-staff", role: "STAFF" };
const patch = (user, group, body) => request(appWithUser(user)).patch(`/api/v1/inventory/${group}`).send(body);

beforeEach(() => {
  rows = new Map([["A_POSITIVE", { id: "inv-A", bloodGroup: "A_POSITIVE", availableUnits: 10, status: "AVAILABLE" }]]);
  movements = [];
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

  test("removing units lowers the quantity and records a movement", async () => {
    const response = await patch(staff, "A_POSITIVE", { delta: -4, reason: "Expired units" });
    expect(response.status).toBe(200);
    expect(response.body.inventory).toEqual({ bloodGroup: "A_POSITIVE", availableUnits: 6, status: "AVAILABLE" });
    expect(movements).toEqual([
      { inventoryId: "inv-A", type: "ADJUSTMENT", delta: -4, reason: "Expired units", actorId: "u-staff" },
    ]);
  });

  test("status follows the quantity down to LOW and OUT_OF_STOCK", async () => {
    const low = await patch(staff, "A_POSITIVE", { delta: -7, reason: "Damaged in storage" });
    expect(low.body.inventory).toMatchObject({ availableUnits: 3, status: "LOW" });
    const out = await patch(staff, "A_POSITIVE", { delta: -3, reason: "Damaged in storage" });
    expect(out.body.inventory).toMatchObject({ availableUnits: 0, status: "OUT_OF_STOCK" });
  });

  test("a positive correction raises the quantity and status", async () => {
    rows.get("A_POSITIVE").availableUnits = 0;
    rows.get("A_POSITIVE").status = "OUT_OF_STOCK";
    const response = await patch(staff, "A_POSITIVE", { delta: 20, reason: "Recount found extra units" });
    expect(response.body.inventory).toMatchObject({ availableUnits: 20, status: "AVAILABLE" });
  });

  test("cannot remove more than is in stock (409) and changes nothing", async () => {
    const response = await patch(staff, "A_POSITIVE", { delta: -11, reason: "Expired units" });
    expect(response.status).toBe(409);
    expect(rows.get("A_POSITIVE").availableUnits).toBe(10);
    expect(movements).toHaveLength(0);
  });

  test("cannot remove units from a group with no inventory row (409)", async () => {
    const response = await patch(staff, "O_NEGATIVE", { delta: -1, reason: "Expired units" });
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
    const response = await patch(staff, group, body);
    expect(response.status).toBe(400);
    expect(response.body.errors.map((e) => e.field)).toContain(field);
    expect(rows.get("A_POSITIVE").availableUnits).toBe(10);
    expect(movements).toHaveLength(0);
  });

  test("simultaneous removals never drive stock negative", async () => {
    const app = appWithUser(staff);
    const send = () => request(app).patch("/api/v1/inventory/A_POSITIVE").send({ delta: -6, reason: "Expired units" });
    const results = await Promise.all([send(), send()]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(rows.get("A_POSITIVE").availableUnits).toBe(4);
  });
});

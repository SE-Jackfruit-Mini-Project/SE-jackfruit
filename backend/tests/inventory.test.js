import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

// In-memory stand-in for the Prisma client used by the inventory service.
const rows = new Map();
const movements = [];
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
  prisma: { $transaction: async (callback) => callback(tx) },
}));

const { inventoryRouter } = await import("../src/routes/inventory.routes.js");
const { deriveStatus, LOW_STOCK_THRESHOLD } = await import("../src/services/inventory.service.js");

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
const validEntry = { bloodGroup: "A_POSITIVE", units: 10, type: "PURCHASE" };

beforeEach(() => {
  rows.clear();
  movements.length = 0;
});

describe("deriveStatus", () => {
  test("maps unit counts to a status", () => {
    expect(deriveStatus(0)).toBe("OUT_OF_STOCK");
    expect(deriveStatus(LOW_STOCK_THRESHOLD)).toBe("LOW");
    expect(deriveStatus(LOW_STOCK_THRESHOLD + 1)).toBe("AVAILABLE");
  });
});

describe("POST /api/v1/inventory/stock", () => {
  test("rejects unauthenticated users with 401", async () => {
    const response = await request(appWithUser(null)).post("/api/v1/inventory/stock").send(validEntry);
    expect(response.status).toBe(401);
    expect(rows.size).toBe(0);
  });

  test.each(["DONOR", "HOSPITAL_REQUESTER"])("rejects %s with 403", async (role) => {
    const response = await request(appWithUser({ id: "u", role }))
      .post("/api/v1/inventory/stock")
      .send(validEntry);
    expect(response.status).toBe(403);
    expect(rows.size).toBe(0);
  });

  test("staff can add a valid entry", async () => {
    const response = await request(appWithUser(staff)).post("/api/v1/inventory/stock").send(validEntry);
    expect(response.status).toBe(201);
    expect(response.body.inventory).toEqual({
      bloodGroup: "A_POSITIVE",
      availableUnits: 10,
      status: "AVAILABLE",
    });
    expect(movements).toEqual([
      { inventoryId: "inv-A_POSITIVE", type: "PURCHASE", delta: 10, reason: null, actorId: "u-staff" },
    ]);
  });

  test("admin can add a valid entry", async () => {
    const response = await request(appWithUser({ id: "u-admin", role: "ADMIN" }))
      .post("/api/v1/inventory/stock")
      .send(validEntry);
    expect(response.status).toBe(201);
  });

  test("adds to an existing quantity and updates status", async () => {
    const app = appWithUser(staff);
    await request(app).post("/api/v1/inventory/stock").send({ ...validEntry, units: 2 });
    const response = await request(app).post("/api/v1/inventory/stock").send({ ...validEntry, units: 8 });
    expect(response.body.inventory).toMatchObject({ availableUnits: 10, status: "AVAILABLE" });
    expect(movements).toHaveLength(2);
  });

  test("reports LOW for a small quantity", async () => {
    const response = await request(appWithUser(staff))
      .post("/api/v1/inventory/stock")
      .send({ ...validEntry, units: 3 });
    expect(response.body.inventory.status).toBe("LOW");
  });

  test.each([
    ["invalid blood group", { ...validEntry, bloodGroup: "X_POSITIVE" }, "bloodGroup"],
    ["missing blood group", { units: 5, type: "PURCHASE" }, "bloodGroup"],
    ["missing units", { bloodGroup: "A_POSITIVE", type: "PURCHASE" }, "units"],
    ["zero units", { ...validEntry, units: 0 }, "units"],
    ["negative units", { ...validEntry, units: -4 }, "units"],
    ["fractional units", { ...validEntry, units: 1.5 }, "units"],
    ["too many units", { ...validEntry, units: 1001 }, "units"],
    ["donation type (belongs to FR-022)", { ...validEntry, type: "DONATION" }, "type"],
    ["missing type", { bloodGroup: "A_POSITIVE", units: 5 }, "type"],
  ])("rejects %s with 400", async (_name, body, field) => {
    const response = await request(appWithUser(staff)).post("/api/v1/inventory/stock").send(body);
    expect(response.status).toBe(400);
    expect(response.body.errors.map((e) => e.field)).toContain(field);
    expect(rows.size).toBe(0);
    expect(movements).toHaveLength(0);
  });
});

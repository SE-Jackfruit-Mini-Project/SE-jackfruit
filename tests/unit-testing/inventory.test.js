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

let failReads = false;

jest.unstable_mockModule("../src/utils/prisma.js", () => ({
  prisma: {
    $transaction: async (callback) => callback(tx),
    inventory: {
      findMany: async () => {
        if (failReads) throw new Error("database unavailable");
        return [...rows.values()].map(({ bloodGroup, availableUnits, status }) => ({
          bloodGroup,
          availableUnits,
          status,
        }));
      },
    },
  },
}));

const { inventoryRouter } = await import("../../backend/src/routes/inventory.routes.js");
const { deriveStatus, LOW_STOCK_THRESHOLD } = await import("../../backend/src/services/inventory.service.js");

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
  failReads = false;
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

describe("GET /api/v1/inventory/availability", () => {
  const get = (user) => request(appWithUser(user)).get("/api/v1/inventory/availability");

  test("rejects unauthenticated users with 401", async () => {
    expect((await get(null)).status).toBe(401);
  });

  test("rejects donors with 403", async () => {
    expect((await get({ id: "u", role: "DONOR" })).status).toBe(403);
  });

  test.each(["HOSPITAL_REQUESTER", "STAFF", "ADMIN"])("allows %s", async (role) => {
    expect((await get({ id: "u", role })).status).toBe(200);
  });

  test("lists all eight blood groups with zero stock when inventory is empty", async () => {
    const response = await get(staff);
    expect(response.body.availability).toHaveLength(8);
    expect(response.body.availability.every((r) => r.availableUnits === 0 && r.status === "OUT_OF_STOCK")).toBe(true);
  });

  test("shows stored quantities and zero for groups without a row", async () => {
    rows.set("O_NEGATIVE", { id: "i1", bloodGroup: "O_NEGATIVE", availableUnits: 12, status: "AVAILABLE" });
    rows.set("B_POSITIVE", { id: "i2", bloodGroup: "B_POSITIVE", availableUnits: 3, status: "LOW" });
    const { availability } = (await get(staff)).body;
    const find = (group) => availability.find((r) => r.bloodGroup === group);
    expect(find("O_NEGATIVE")).toEqual({ bloodGroup: "O_NEGATIVE", availableUnits: 12, status: "AVAILABLE" });
    expect(find("B_POSITIVE")).toMatchObject({ availableUnits: 3, status: "LOW" });
    expect(find("A_POSITIVE")).toMatchObject({ availableUnits: 0, status: "OUT_OF_STOCK" });
  });

  test("does not change stock quantities", async () => {
    rows.set("O_NEGATIVE", { id: "i1", bloodGroup: "O_NEGATIVE", availableUnits: 12, status: "AVAILABLE" });
    await get(staff);
    await get(staff);
    expect(rows.get("O_NEGATIVE").availableUnits).toBe(12);
    expect(movements).toHaveLength(0);
  });

  test("returns 500 with a message when inventory cannot be read", async () => {
    failReads = true;
    jest.spyOn(console, "error").mockImplementation(() => {});
    const app = appWithUser(staff);
    app.use((error, _req, res, _next) => res.status(500).json({ message: "The request could not be completed." }));
    const response = await request(app).get("/api/v1/inventory/availability");
    expect(response.status).toBe(500);
  });
});

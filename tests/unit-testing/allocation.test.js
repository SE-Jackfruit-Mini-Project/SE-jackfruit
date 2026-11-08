import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

// In-memory stand-in for the Prisma client; a failed transaction is rolled back.
let rows = new Map();
let requests = new Map();
let movements = [];

const tx = {
  bloodRequest: {
    findUnique: async ({ where }) => {
      const found = requests.get(where.id);
      return found ? { ...found } : null;
    },
    updateMany: async ({ where, data }) => {
      const found = requests.get(where.id);
      if (!found || found.status !== where.status) return { count: 0 };
      Object.assign(found, data);
      return { count: 1 };
    },
  },
  inventory: {
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
    bloodRequest: {
      findMany: async ({ where }) =>
        [...requests.values()]
          .filter((r) => r.status === where.status)
          .sort((a, b) => a.createdAt - b.createdAt)
          .map(({ status: _status, ...rest }) => rest),
    },
    $transaction: async (callback) => {
      const rowSnapshot = new Map([...rows].map(([key, row]) => [key, { ...row }]));
      const requestSnapshot = new Map([...requests].map(([key, row]) => [key, { ...row }]));
      const movementCount = movements.length;
      try {
        return await callback(tx);
      } catch (error) {
        rows = rowSnapshot;
        requests = requestSnapshot;
        movements.length = movementCount;
        throw error;
      }
    },
  },
}));

const { allocationRouter } = await import("../src/routes/allocation.routes.js");

function appWithUser(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (user) req.session = { user };
    next();
  });
  app.use("/api/v1/allocations", allocationRouter);
  return app;
}

const staff = { id: "u-staff", role: "STAFF" };
const allocate = (user, id) => request(appWithUser(user)).post(`/api/v1/allocations/${id}`);

function makeRequest(id, overrides = {}) {
  return {
    id,
    hospitalName: "City General",
    bloodGroup: "A_POSITIVE",
    units: 4,
    urgency: "NORMAL",
    status: "APPROVED",
    createdAt: new Date(`2026-10-0${id.length}T00:00:00Z`),
    ...overrides,
  };
}

beforeEach(() => {
  rows = new Map([["A_POSITIVE", { id: "inv-A", bloodGroup: "A_POSITIVE", availableUnits: 10, status: "AVAILABLE" }]]);
  requests = new Map([["r1", makeRequest("r1")]]);
  movements = [];
});

describe("GET /api/v1/allocations/pending", () => {
  const get = (user) => request(appWithUser(user)).get("/api/v1/allocations/pending");

  test("rejects unauthenticated users with 401", async () => {
    expect((await get(null)).status).toBe(401);
  });

  test.each(["DONOR", "HOSPITAL_REQUESTER"])("rejects %s with 403", async (role) => {
    expect((await get({ id: "u", role })).status).toBe(403);
  });

  test("lists only approved requests", async () => {
    requests.set("r22", makeRequest("r22", { status: "PENDING" }));
    requests.set("r333", makeRequest("r333", { status: "ALLOCATED" }));
    const response = await get(staff);
    expect(response.status).toBe(200);
    expect(response.body.requests.map((r) => r.id)).toEqual(["r1"]);
  });
});

describe("POST /api/v1/allocations/:requestId", () => {
  test("rejects unauthenticated users with 401", async () => {
    expect((await allocate(null, "r1")).status).toBe(401);
  });

  test.each(["DONOR", "HOSPITAL_REQUESTER"])("rejects %s with 403 and allocates nothing", async (role) => {
    const response = await allocate({ id: "u", role }, "r1");
    expect(response.status).toBe(403);
    expect(requests.get("r1").status).toBe("APPROVED");
    expect(rows.get("A_POSITIVE").availableUnits).toBe(10);
  });

  test("allocates an approved request and reduces inventory", async () => {
    const response = await allocate(staff, "r1");
    expect(response.status).toBe(200);
    expect(response.body.allocation).toEqual({
      requestId: "r1",
      status: "ALLOCATED",
      bloodGroup: "A_POSITIVE",
      unitsAllocated: 4,
      inventory: { availableUnits: 6, status: "AVAILABLE" },
    });
    expect(requests.get("r1").status).toBe("ALLOCATED");
    expect(movements).toEqual([
      {
        inventoryId: "inv-A",
        type: "ALLOCATION",
        delta: -4,
        reason: "Allocated to blood request",
        referenceId: "r1",
        actorId: "u-staff",
      },
    ]);
  });

  test("admin can allocate", async () => {
    expect((await allocate({ id: "u-admin", role: "ADMIN" }, "r1")).status).toBe(200);
  });

  test("allocating all remaining stock leaves exactly zero and OUT_OF_STOCK", async () => {
    rows.get("A_POSITIVE").availableUnits = 4;
    const response = await allocate(staff, "r1");
    expect(response.body.allocation.inventory).toEqual({ availableUnits: 0, status: "OUT_OF_STOCK" });
  });

  test("insufficient inventory is rejected (409) and nothing changes", async () => {
    rows.get("A_POSITIVE").availableUnits = 3;
    const response = await allocate(staff, "r1");
    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/insufficient/i);
    expect(requests.get("r1").status).toBe("APPROVED");
    expect(rows.get("A_POSITIVE").availableUnits).toBe(3);
    expect(movements).toHaveLength(0);
  });

  test("a blood group with no inventory row is rejected (409)", async () => {
    requests.set("r1", makeRequest("r1", { bloodGroup: "O_NEGATIVE" }));
    const response = await allocate(staff, "r1");
    expect(response.status).toBe(409);
    expect(requests.get("r1").status).toBe("APPROVED");
  });

  test.each(["PENDING", "REJECTED", "ALLOCATED"])("a %s request cannot be allocated (409)", async (status) => {
    requests.set("r1", makeRequest("r1", { status }));
    const response = await allocate(staff, "r1");
    expect(response.status).toBe(409);
    expect(rows.get("A_POSITIVE").availableUnits).toBe(10);
    expect(movements).toHaveLength(0);
  });

  test("an unknown request returns 404", async () => {
    expect((await allocate(staff, "missing")).status).toBe(404);
  });

  test("a repeated allocation does not deduct stock twice", async () => {
    await allocate(staff, "r1");
    const second = await allocate(staff, "r1");
    expect(second.status).toBe(409);
    expect(rows.get("A_POSITIVE").availableUnits).toBe(6);
    expect(movements).toHaveLength(1);
  });

  test("simultaneous allocations that exceed stock never oversell", async () => {
    rows.get("A_POSITIVE").availableUnits = 6;
    requests.set("r22", makeRequest("r22"));
    const app = appWithUser(staff);
    const results = await Promise.all([
      request(app).post("/api/v1/allocations/r1"),
      request(app).post("/api/v1/allocations/r22"),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(rows.get("A_POSITIVE").availableUnits).toBe(2);
    expect(movements).toHaveLength(1);
    const statuses = [requests.get("r1").status, requests.get("r22").status].sort();
    expect(statuses).toEqual(["ALLOCATED", "APPROVED"]);
  });
});

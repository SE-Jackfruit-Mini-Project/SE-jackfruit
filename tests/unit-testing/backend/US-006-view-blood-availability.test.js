/**
 * @file US-006-view-blood-availability.test.js
 * @description Unit test suite for US-006: View Blood Availability.
 * Verifies that availability queries always output the complete catalog of all 8 blood groups
 * (defaulting unseeded groups to 0 units and OUT_OF_STOCK) without side effects on inventory records.
 */

import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

const findMany = jest.fn();

// Mock Prisma client singleton
jest.unstable_mockModule("../../../backend/src/utils/prisma.js", () => ({
  prisma: {
    inventory: { findMany },
  },
}));

const {
  getAvailability,
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
  app.use((_error, _req, res, _next) =>
    res.status(500).json({ message: "The request could not be completed." }));
  return app;
}

const getAvailabilityResponse = (user) =>
  request(appWithUser(user)).get("/api/v1/inventory/availability");

beforeEach(() => {
  findMany.mockReset();
});

describe("US-006 view blood availability", () => {
  test("returns all eight blood groups", async () => {
    findMany.mockResolvedValue([]);

    const result = await getAvailability();

    expect(result).toHaveLength(8);
    expect(
      result.every(
        (row) =>
          row.availableUnits === 0 &&
          row.status === "OUT_OF_STOCK",
      ),
    ).toBe(true);
  });

  test("returns stored quantities for available groups", async () => {
    findMany.mockResolvedValue([
      {
        bloodGroup: "O_NEGATIVE",
        availableUnits: 12,
        status: "AVAILABLE",
      },
    ]);

    const result = await getAvailability();

    expect(result.find((row) => row.bloodGroup === "O_NEGATIVE"))
      .toEqual({
        bloodGroup: "O_NEGATIVE",
        availableUnits: 12,
        status: "AVAILABLE",
      });
  });

  test("does not modify inventory while reading", async () => {
    findMany.mockResolvedValue([]);

    await getAvailability();

    expect(findMany).toHaveBeenCalledTimes(1);
  });
});

describe("US-006 availability endpoint", () => {
  test("requires login and rejects donor accounts", async () => {
    expect((await getAvailabilityResponse(null)).status).toBe(401);
    expect((await getAvailabilityResponse({ id: "donor-1", role: "DONOR" })).status).toBe(403);
    expect(findMany).not.toHaveBeenCalled();
  });

  test.each(["HOSPITAL_REQUESTER", "STAFF", "ADMIN"])("allows %s to view stock", async (role) => {
    findMany.mockResolvedValue([]);
    const response = await getAvailabilityResponse({ id: "user-1", role });
    expect(response.status).toBe(200);
    expect(response.body.availability).toHaveLength(8);
    expect(response.body.availability.every((row) => row.availableUnits === 0 && row.status === "OUT_OF_STOCK")).toBe(true);
  });

  test("shows stored quantities and zero for groups without a row", async () => {
    findMany.mockResolvedValue([
      { bloodGroup: "O_NEGATIVE", availableUnits: 12, status: "AVAILABLE" },
      { bloodGroup: "B_POSITIVE", availableUnits: 3, status: "LOW" },
    ]);
    const response = await getAvailabilityResponse({ id: "staff-1", role: "STAFF" });
    const byGroup = new Map(response.body.availability.map((row) => [row.bloodGroup, row]));
    expect(byGroup.get("O_NEGATIVE")).toEqual({ bloodGroup: "O_NEGATIVE", availableUnits: 12, status: "AVAILABLE" });
    expect(byGroup.get("B_POSITIVE")).toMatchObject({ availableUnits: 3, status: "LOW" });
    expect(byGroup.get("A_POSITIVE")).toMatchObject({ availableUnits: 0, status: "OUT_OF_STOCK" });
  });

  test("viewing availability does not modify stored quantities", async () => {
    const row = { bloodGroup: "O_NEGATIVE", availableUnits: 12, status: "AVAILABLE" };
    findMany.mockResolvedValue([row]);
    const staff = { id: "staff-1", role: "STAFF" };
    await getAvailabilityResponse(staff);
    await getAvailabilityResponse(staff);
    expect(row.availableUnits).toBe(12);
    expect(findMany).toHaveBeenCalledTimes(2);
  });

  test("returns a safe error when inventory cannot be read", async () => {
    findMany.mockRejectedValue(new Error("database unavailable"));
    const response = await getAvailabilityResponse({ id: "staff-1", role: "STAFF" });
    expect(response.status).toBe(500);
    expect(response.body.message).toBe("The request could not be completed.");
  });
});

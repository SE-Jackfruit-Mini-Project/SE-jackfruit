import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

const addStock = jest.fn();
const adjustStock = jest.fn();
const getAvailability = jest.fn();

jest.unstable_mockModule("../../backend/src/services/inventory.service.js", () => ({ addStock, adjustStock, getAvailability }));

const { inventoryRouter } = await import("../../backend/src/routes/inventory.routes.js");

function createApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { if (user) req.session = { user }; next(); });
  app.use("/api/v1/inventory", inventoryRouter);
  return app;
}

beforeEach(() => jest.clearAllMocks());

describe("EPIC-03 Blood Inventory and Availability component", () => {
  test("hospital requesters can read availability without changing inventory", async () => {
    getAvailability.mockResolvedValue([
      { bloodGroup: "A_POSITIVE", availableUnits: 4, status: "LOW" },
      { bloodGroup: "O_NEGATIVE", availableUnits: 0, status: "OUT_OF_STOCK" },
    ]);

    const response = await request(createApp({ id: "hospital-1", role: "HOSPITAL_REQUESTER" }))
      .get("/api/v1/inventory/availability");

    expect(response.status).toBe(200);
    expect(response.body.availability).toEqual([
      { bloodGroup: "A_POSITIVE", availableUnits: 4, status: "LOW" },
      { bloodGroup: "O_NEGATIVE", availableUnits: 0, status: "OUT_OF_STOCK" },
    ]);
    expect(getAvailability).toHaveBeenCalledTimes(1);
    expect(addStock).not.toHaveBeenCalled();
  });

  test("staff can record a non-donation stock intake", async () => {
    const entry = { bloodGroup: "B_POSITIVE", units: 3, type: "TRANSFER_IN", reason: "Regional bank" };
    addStock.mockResolvedValue({ bloodGroup: "B_POSITIVE", availableUnits: 3, status: "LOW" });

    const response = await request(createApp({ id: "staff-1", role: "STAFF" }))
      .post("/api/v1/inventory/stock").send(entry);

    expect(response.status).toBe(201);
    expect(response.body.inventory.availableUnits).toBe(3);
    expect(addStock).toHaveBeenCalledWith("staff-1", entry);
  });

  test("staff can apply a reasoned quantity adjustment", async () => {
    adjustStock.mockResolvedValue({ bloodGroup: "B_POSITIVE", availableUnits: 1, status: "LOW" });

    const response = await request(createApp({ id: "staff-1", role: "STAFF" }))
      .patch("/api/v1/inventory/B_POSITIVE").send({ delta: -2, reason: "Spoiled units" });

    expect(response.status).toBe(200);
    expect(response.body.inventory).toMatchObject({ availableUnits: 1, status: "LOW" });
    expect(adjustStock).toHaveBeenCalledWith("staff-1", { delta: -2, reason: "Spoiled units", bloodGroup: "B_POSITIVE" });
  });

  test("donors cannot read or modify staff inventory controls", async () => {
    const app = createApp({ id: "donor-1", role: "DONOR" });
    const read = await request(app).get("/api/v1/inventory/availability");
    const write = await request(app).post("/api/v1/inventory/stock").send({});

    expect(read.status).toBe(403);
    expect(write.status).toBe(403);
    expect(getAvailability).not.toHaveBeenCalled();
    expect(addStock).not.toHaveBeenCalled();
  });
});

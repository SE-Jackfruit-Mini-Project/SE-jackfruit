import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

const addStock = jest.fn();
const adjustStock = jest.fn();
const getAvailability = jest.fn();
const validateStockAddition = jest.fn();
const validateStockAdjustment = jest.fn();
const submitOperationProposal = jest.fn();
const decideOperationApproval = jest.fn();
const listOperationApprovals = jest.fn();
class OperationApprovalError extends Error {}

jest.unstable_mockModule("../../backend/src/services/inventory.service.js", () => ({ addStock, adjustStock, getAvailability, validateStockAddition, validateStockAdjustment }));
jest.unstable_mockModule("../../backend/src/services/operation-approval.service.js", () => ({ submitOperationProposal, decideOperationApproval, listOperationApprovals, OperationApprovalError }));

const { inventoryRouter } = await import("../../backend/src/routes/inventory.routes.js");
const { operationApprovalRouter } = await import("../../backend/src/routes/operation-approval.routes.js");

function createApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { if (user) req.session = { user }; next(); });
  app.use("/api/v1/inventory", inventoryRouter);
  app.use("/api/v1/operation-approvals", operationApprovalRouter);
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

  test("staff stock intake stays pending until an admin approves it", async () => {
    const entry = { bloodGroup: "B_POSITIVE", units: 3, type: "TRANSFER_IN", reason: "Regional bank" };
    submitOperationProposal.mockResolvedValue({ id: "approval-stock", status: "PENDING" });

    const response = await request(createApp({ id: "staff-1", role: "STAFF" }))
      .post("/api/v1/inventory/stock").send(entry);

    expect(response.status).toBe(202);
    expect(response.body.approval.status).toBe("PENDING");
    expect(submitOperationProposal).toHaveBeenCalledWith("staff-1", "ADD_STOCK", entry);
    expect(addStock).not.toHaveBeenCalled();
  });

  test("staff inventory adjustment stays pending while admin changes apply directly", async () => {
    submitOperationProposal.mockResolvedValue({ id: "approval-adjustment", status: "PENDING" });
    adjustStock.mockResolvedValue({ bloodGroup: "B_POSITIVE", availableUnits: 1, status: "LOW" });

    const staffResponse = await request(createApp({ id: "staff-1", role: "STAFF" }))
      .patch("/api/v1/inventory/B_POSITIVE").send({ delta: -2, reason: "Spoiled units" });
    const adminResponse = await request(createApp({ id: "admin-1", role: "ADMIN" }))
      .patch("/api/v1/inventory/B_POSITIVE").send({ delta: -2, reason: "Spoiled units" });

    expect(staffResponse.status).toBe(202);
    expect(staffResponse.body.approval.status).toBe("PENDING");
    expect(submitOperationProposal).toHaveBeenCalledWith("staff-1", "ADJUST_STOCK", { delta: -2, reason: "Spoiled units", bloodGroup: "B_POSITIVE" });
    expect(adminResponse.status).toBe(200);
    expect(adminResponse.body.inventory).toMatchObject({ availableUnits: 1, status: "LOW" });
    expect(adjustStock).toHaveBeenCalledWith("admin-1", { delta: -2, reason: "Spoiled units", bloodGroup: "B_POSITIVE" });
  });

  test("only admins can approve staff inventory proposals", async () => {
    decideOperationApproval.mockResolvedValue({ id: "approval-stock", status: "APPROVED" });
    const response = await request(createApp({ id: "admin-1", role: "ADMIN" }))
      .post("/api/v1/operation-approvals/approval-stock/review").send({ decision: "APPROVE" });

    expect(response.status).toBe(200);
    expect(decideOperationApproval).toHaveBeenCalledWith("approval-stock", "admin-1", "APPROVE", "");
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

import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

const createBloodRequest = jest.fn();
const getRequesterRequests = jest.fn();
const getAllRequests = jest.fn();
const reviewBloodRequest = jest.fn();
const getApprovedRequests = jest.fn();
const allocateRequest = jest.fn();
const getAllUsers = jest.fn();
const updateUserRole = jest.fn();
const updateUserStatus = jest.fn();

jest.unstable_mockModule("../../backend/src/services/request.service.js", () => ({ createBloodRequest, getRequesterRequests, getAllRequests, reviewBloodRequest }));
jest.unstable_mockModule("../../backend/src/services/allocation.service.js", () => ({ getApprovedRequests, allocateRequest }));
jest.unstable_mockModule("../../backend/src/services/admin.service.js", () => ({ getAllUsers, updateUserRole, updateUserStatus }));

const { requestRouter } = await import("../../backend/src/routes/request.routes.js");
const { allocationRouter } = await import("../../backend/src/routes/allocation.routes.js");
const { adminRouter } = await import("../../backend/src/routes/admin.routes.js");

function createApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { if (user) req.session = { user }; next(); });
  app.use("/api/v1/requests", requestRouter);
  app.use("/api/v1/allocations", allocationRouter);
  app.use("/api/v1/admin", adminRouter);
  return app;
}

beforeEach(() => jest.clearAllMocks());

describe("EPIC-04 Blood Requests and Administration component", () => {
  test("hospital requesters submit a request and see its initial status", async () => {
    const bloodRequest = { id: "request-1", hospitalName: "City Hospital", status: "PENDING" };
    createBloodRequest.mockResolvedValue(bloodRequest);

    const payload = { hospitalName: "City Hospital", bloodGroup: "A_POSITIVE", units: 2 };
    const response = await request(createApp({ id: "hospital-1", role: "HOSPITAL_REQUESTER" }))
      .post("/api/v1/requests").send(payload);

    expect(response.status).toBe(201);
    expect(response.body.request.status).toBe("PENDING");
    expect(createBloodRequest).toHaveBeenCalledWith("hospital-1", payload);
  });

  test("staff can review requests and allocate approved requests", async () => {
    reviewBloodRequest.mockResolvedValue({ id: "request-1", status: "APPROVED" });
    allocateRequest.mockResolvedValue({ requestId: "request-1", status: "ALLOCATED", unitsAllocated: 2 });

    const app = createApp({ id: "staff-1", role: "STAFF" });
    const reviewed = await request(app).patch("/api/v1/requests/request-1/review").send({ status: "APPROVED" });
    const allocated = await request(app).post("/api/v1/allocations/request-1");

    expect(reviewed.status).toBe(200);
    expect(reviewed.body.request.status).toBe("APPROVED");
    expect(allocated.status).toBe(200);
    expect(allocated.body.allocation.status).toBe("ALLOCATED");
    expect(reviewBloodRequest).toHaveBeenCalledWith("request-1", "APPROVED");
    expect(allocateRequest).toHaveBeenCalledWith("staff-1", "request-1");
  });

  test("administrative user controls are available to admins only", async () => {
    getAllUsers.mockResolvedValue([{ id: "user-1", role: "STAFF" }]);
    updateUserRole.mockResolvedValue({ id: "user-1", role: "ADMIN" });

    const admin = createApp({ id: "admin-1", role: "ADMIN" });
    const list = await request(admin).get("/api/v1/admin/users");
    const changed = await request(admin).patch("/api/v1/admin/users/user-1/role").send({ role: "ADMIN" });
    const denied = await request(createApp({ id: "staff-1", role: "STAFF" })).get("/api/v1/admin/users");

    expect(list.status).toBe(200);
    expect(changed.status).toBe(200);
    expect(changed.body.user.role).toBe("ADMIN");
    expect(denied.status).toBe(403);
  });

  test("unauthenticated users cannot access request or allocation workflows", async () => {
    const app = createApp(null);
    const submit = await request(app).post("/api/v1/requests").send({});
    const allocate = await request(app).post("/api/v1/allocations/request-1");

    expect(submit.status).toBe(401);
    expect(allocate.status).toBe(401);
    expect(createBloodRequest).not.toHaveBeenCalled();
    expect(allocateRequest).not.toHaveBeenCalled();
  });
});

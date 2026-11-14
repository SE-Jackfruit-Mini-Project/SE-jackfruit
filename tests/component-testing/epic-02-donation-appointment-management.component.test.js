import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

const listStaffAppointments = jest.fn();
const updateStaffAppointmentStatus = jest.fn();
jest.unstable_mockModule("../../backend/src/services/staff-appointment.service.js", () => ({ listStaffAppointments, updateStaffAppointmentStatus }));

const createAppointmentSlot = jest.fn();
const getAvailableSlots = jest.fn();
const getAllSlots = jest.fn();
const deleteAppointmentSlot = jest.fn();
const validateAppointmentSlotInput = jest.fn();
const bookAppointment = jest.fn();
const getDonorAppointments = jest.fn();
const rescheduleDonorAppointment = jest.fn();
const cancelDonorAppointment = jest.fn();
const getRegisteredDonors = jest.fn();
const getRecentDonations = jest.fn();
const recordCompletedDonation = jest.fn();
const submitOperationProposal = jest.fn();
const decideOperationApproval = jest.fn();
const listOperationApprovals = jest.fn();
class OperationApprovalError extends Error {}

jest.unstable_mockModule("../../backend/src/services/appointment-slot.service.js", () => ({ createAppointmentSlot, getAvailableSlots, getAllSlots, deleteAppointmentSlot, validateAppointmentSlotInput }));
jest.unstable_mockModule("../../backend/src/services/appointment.service.js", () => ({ bookAppointment, getDonorAppointments }));
jest.unstable_mockModule("../../backend/src/services/appointment-management.service.js", () => ({ getDonorAppointments, rescheduleDonorAppointment, cancelDonorAppointment }));
jest.unstable_mockModule("../../backend/src/services/donation.service.js", () => ({ getRegisteredDonors, getRecentDonations, recordCompletedDonation }));
jest.unstable_mockModule("../../backend/src/services/operation-approval.service.js", () => ({ submitOperationProposal, decideOperationApproval, listOperationApprovals, OperationApprovalError }));

const { appointmentSlotRouter } = await import("../../backend/src/routes/appointment-slot.routes.js");
const { appointmentRouter } = await import("../../backend/src/routes/appointment.routes.js");
const { appointmentManagementRouter } = await import("../../backend/src/routes/appointment-management.routes.js");
const { donationRouter } = await import("../../backend/src/routes/donation.routes.js");
const { operationApprovalRouter } = await import("../../backend/src/routes/operation-approval.routes.js");

function createApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { if (user) req.session = { user }; next(); });
  app.use("/api/v1/appointment-slots", appointmentSlotRouter);
  app.use("/api/v1/appointments", appointmentRouter);
  app.use("/api/v1/appointment-management", appointmentManagementRouter);
  app.use("/api/v1/donations", donationRouter);
  app.use("/api/v1/operation-approvals", operationApprovalRouter);
  return app;
}

beforeEach(() => jest.clearAllMocks());

describe("EPIC-02 Donation and Appointment Management component", () => {
  test("staff slot creation is proposed for admin approval; donors can view available slots", async () => {
    submitOperationProposal.mockResolvedValue({ id: "approval-1", status: "PENDING" });
    getAvailableSlots.mockResolvedValue([{ id: "slot-1", isAvailable: true }]);

    const staff = createApp({ id: "staff-1", role: "STAFF" });
    const created = await request(staff).post("/api/v1/appointment-slots").send({ date: "2027-01-02" });
    const available = await request(createApp({ id: "donor-1", role: "DONOR" })).get("/api/v1/appointment-slots");

    expect(created.status).toBe(202);
    expect(created.body.approval.status).toBe("PENDING");
    expect(available.status).toBe(200);
    expect(available.body.slots).toHaveLength(1);
    expect(submitOperationProposal).toHaveBeenCalledWith("staff-1", "CREATE_SLOT", { date: "2027-01-02" });
    expect(createAppointmentSlot).not.toHaveBeenCalled();
  });

  test("admin can create or delete a slot directly and review staff proposals", async () => {
    createAppointmentSlot.mockResolvedValue({ id: "slot-1", maxCapacity: 10 });
    deleteAppointmentSlot.mockResolvedValue({ id: "slot-1" });
    decideOperationApproval.mockResolvedValue({ id: "approval-1", status: "APPROVED" });
    const admin = createApp({ id: "admin-1", role: "ADMIN" });

    const created = await request(admin).post("/api/v1/appointment-slots").send({ date: "2027-01-02" });
    const deleted = await request(admin).delete("/api/v1/appointment-slots/slot-1");
    const reviewed = await request(admin).post("/api/v1/operation-approvals/approval-1/review").send({ decision: "APPROVE" });

    expect(created.status).toBe(201);
    expect(deleted.status).toBe(200);
    expect(reviewed.status).toBe(200);
    expect(decideOperationApproval).toHaveBeenCalledWith("approval-1", "admin-1", "APPROVE", "");
  });

  test("staff slot deletion is proposed and cannot be directly applied", async () => {
    submitOperationProposal.mockResolvedValue({ id: "approval-delete", status: "PENDING" });
    const response = await request(createApp({ id: "staff-1", role: "STAFF" }))
      .delete("/api/v1/appointment-slots/slot-1");

    expect(response.status).toBe(202);
    expect(response.body.approval.status).toBe("PENDING");
    expect(submitOperationProposal).toHaveBeenCalledWith("staff-1", "DELETE_SLOT", { slotId: "slot-1" });
    expect(deleteAppointmentSlot).not.toHaveBeenCalled();
  });

  test("booking connects the donor session to the selected slot", async () => {
    bookAppointment.mockResolvedValue({ id: "appointment-1", status: "SCHEDULED" });

    const response = await request(createApp({ id: "donor-1", role: "DONOR" }))
      .post("/api/v1/appointments").send({ slotId: "slot-1", weightKg: 55 });

    expect(response.status).toBe(201);
    expect(response.body.appointment.status).toBe("SCHEDULED");
    expect(bookAppointment).toHaveBeenCalledWith("donor-1", { slotId: "slot-1", weightKg: 55 });
  });

  test("donors can cancel and reschedule their appointments", async () => {
    cancelDonorAppointment.mockResolvedValue({ id: "appointment-1", status: "CANCELLED" });
    rescheduleDonorAppointment.mockResolvedValue({ id: "appointment-1", slotId: "slot-2" });

    const app = createApp({ id: "donor-1", role: "DONOR" });
    const cancelled = await request(app).patch("/api/v1/appointment-management/appointment-1/cancel");
    const rescheduled = await request(app).patch("/api/v1/appointment-management/appointment-1/reschedule").send({ slotId: "slot-2" });

    expect(cancelled.status).toBe(200);
    expect(cancelled.body.appointment.status).toBe("CANCELLED");
    expect(rescheduled.status).toBe(200);
    expect(rescheduled.body.appointment.slotId).toBe("slot-2");
    expect(cancelDonorAppointment).toHaveBeenCalledWith("donor-1", "appointment-1");
  });

  test("staff can record a completed donation, while donors cannot", async () => {
    recordCompletedDonation.mockResolvedValue({ donation: { id: "donation-1", accepted: true }, inventoryUpdated: true });

    const payload = { donorId: "donor-1", units: 1, donationDate: "2026-11-10", accepted: true };
    const recorded = await request(createApp({ id: "staff-1", role: "STAFF" })).post("/api/v1/donations").send(payload);
    const denied = await request(createApp({ id: "donor-1", role: "DONOR" })).post("/api/v1/donations").send(payload);

    expect(recorded.status).toBe(201);
    expect(recorded.body.inventoryUpdated).toBe(true);
    expect(denied.status).toBe(403);
    expect(recordCompletedDonation).toHaveBeenCalledWith("staff-1", payload);
  });

  test.each(["STAFF", "ADMIN"])("%s can list appointments and cancel through status API", async role => {
    listStaffAppointments.mockResolvedValue({ appointments: [{ id: "a1" }], hasMore: false });
    updateStaffAppointmentStatus.mockResolvedValue({ id: "a1", status: "CANCELLED" });
    const app = createApp({ id: "operator", role });
    expect((await request(app).get("/api/v1/appointments?status=SCHEDULED&page=2")).body.appointments).toEqual([{ id: "a1" }]);
    expect(listStaffAppointments).toHaveBeenCalledWith({ status: "SCHEDULED", page: "2" });
    const changed = await request(app).patch("/api/v1/appointments/a1/status").send({ status: "CANCELLED" });
    expect(changed.status).toBe(200); expect(changed.body.appointment.status).toBe("CANCELLED");
    expect(updateStaffAppointmentStatus).toHaveBeenCalledWith("a1", { status: "CANCELLED" });
  });

  test.each([null, "DONOR", "HOSPITAL_REQUESTER"])("denies operational appointment APIs for %s", async role => {
    const app = createApp(role ? { id: "u", role } : null);
    expect((await request(app).get("/api/v1/appointments")).status).toBe(role ? 403 : 401);
    expect((await request(app).patch("/api/v1/appointments/a1/status").send({ status: "CANCELLED" })).status).toBe(role ? 403 : 401);
    expect(updateStaffAppointmentStatus).not.toHaveBeenCalled();
  });

  test("staff API exposes controlled validation and conflict errors", async () => {
    const app = createApp({ id: "staff", role: "STAFF" });
    listStaffAppointments.mockRejectedValueOnce(Object.assign(new Error(), { name: "ZodError" }));
    expect((await request(app).get("/api/v1/appointments?page=0")).status).toBe(400);
    updateStaffAppointmentStatus.mockRejectedValueOnce(Object.assign(new Error("Appointment changed"), { status: 409 }));
    expect((await request(app).patch("/api/v1/appointments/a1/status").send({ status: "CANCELLED" })).status).toBe(409);
  });

});

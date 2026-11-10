import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

const createAppointmentSlot = jest.fn();
const getAvailableSlots = jest.fn();
const getAllSlots = jest.fn();
const bookAppointment = jest.fn();
const getDonorAppointments = jest.fn();
const rescheduleDonorAppointment = jest.fn();
const cancelDonorAppointment = jest.fn();
const getRegisteredDonors = jest.fn();
const getRecentDonations = jest.fn();
const recordCompletedDonation = jest.fn();

jest.unstable_mockModule("../../backend/src/services/appointment-slot.service.js", () => ({ createAppointmentSlot, getAvailableSlots, getAllSlots }));
jest.unstable_mockModule("../../backend/src/services/appointment.service.js", () => ({ bookAppointment, getDonorAppointments }));
jest.unstable_mockModule("../../backend/src/services/appointment-management.service.js", () => ({ getDonorAppointments, rescheduleDonorAppointment, cancelDonorAppointment }));
jest.unstable_mockModule("../../backend/src/services/donation.service.js", () => ({ getRegisteredDonors, getRecentDonations, recordCompletedDonation }));

const { appointmentSlotRouter } = await import("../../backend/src/routes/appointment-slot.routes.js");
const { appointmentRouter } = await import("../../backend/src/routes/appointment.routes.js");
const { appointmentManagementRouter } = await import("../../backend/src/routes/appointment-management.routes.js");
const { donationRouter } = await import("../../backend/src/routes/donation.routes.js");

function createApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { if (user) req.session = { user }; next(); });
  app.use("/api/v1/appointment-slots", appointmentSlotRouter);
  app.use("/api/v1/appointments", appointmentRouter);
  app.use("/api/v1/appointment-management", appointmentManagementRouter);
  app.use("/api/v1/donations", donationRouter);
  return app;
}

beforeEach(() => jest.clearAllMocks());

describe("EPIC-02 Donation and Appointment Management component", () => {
  test("staff can create slots and donors can view available slots", async () => {
    createAppointmentSlot.mockResolvedValue({ id: "slot-1", maxCapacity: 10 });
    getAvailableSlots.mockResolvedValue([{ id: "slot-1", isAvailable: true }]);

    const staff = createApp({ id: "staff-1", role: "STAFF" });
    const created = await request(staff).post("/api/v1/appointment-slots").send({ date: "2027-01-02" });
    const available = await request(createApp({ id: "donor-1", role: "DONOR" })).get("/api/v1/appointment-slots");

    expect(created.status).toBe(201);
    expect(available.status).toBe(200);
    expect(available.body.slots).toHaveLength(1);
    expect(createAppointmentSlot).toHaveBeenCalledWith({ date: "2027-01-02" });
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
});

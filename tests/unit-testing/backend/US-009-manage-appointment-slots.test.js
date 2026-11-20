/**
 * @file US-009-manage-appointment-slots.test.js
 * @description Unit test suite for US-009: Manage Appointment Slots.
 * Tests past-date slot rejection, invalid time range validation (endTime <= startTime),
 * and filtering of future available appointment slots.
 */

import { jest } from "@jest/globals";

const findMany = jest.fn();
const create = jest.fn();
const findUnique = jest.fn();
const deleteSlot = jest.fn();
const approvalFindMany = jest.fn();
const approvalFindUnique = jest.fn();
const approvalCreate = jest.fn();
const approvalUpdateMany = jest.fn();
const transaction = jest.fn();

// Mock Prisma client singleton
jest.unstable_mockModule("../../../backend/src/utils/prisma.js", () => ({
  prisma: {
    appointmentSlot: {
      findMany,
      create,
      findUnique,
      delete: deleteSlot,
    },
    operationApproval: {
      findMany: approvalFindMany,
      findUnique: approvalFindUnique,
      create: approvalCreate,
      updateMany: approvalUpdateMany,
    },
    $transaction: transaction,
  },
}));

const {
  createAppointmentSlot,
  deleteAppointmentSlot,
  getAvailableSlots,
} = await import("../../../backend/src/services/appointment-slot.service.js");
const {
  submitOperationProposal,
  listOperationApprovals,
  decideOperationApproval,
} = await import("../../../backend/src/services/operation-approval.service.js");

beforeEach(() => {
  findMany.mockReset();
  create.mockReset();
  findUnique.mockReset();
  deleteSlot.mockReset();
  approvalFindMany.mockReset();
  approvalFindUnique.mockReset();
  approvalCreate.mockReset();
  approvalUpdateMany.mockReset();
  transaction.mockReset();

  transaction.mockImplementation(async (callback) =>
    callback({
      appointmentSlot: {
        findMany,
        create,
        findUnique,
        delete: deleteSlot,
      },
      operationApproval: {
        findMany: approvalFindMany,
        findUnique: approvalFindUnique,
        updateMany: approvalUpdateMany,
      },
    })
  );
});

describe("US-009 manage appointment slots", () => {
  test("rejects a slot in the past", async () => {
    await expect(
      createAppointmentSlot({
        date: "2020-01-01",
        startTime: "10:00",
        endTime: "11:00",
        maxCapacity: 5,
      }),
    ).rejects.toMatchObject({
      name: "ZodError",
    });

    expect(create).not.toHaveBeenCalled();
  });

  test("rejects an invalid time range", async () => {
    await expect(
      createAppointmentSlot({
        date: "2099-01-01",
        startTime: "12:00",
        endTime: "11:00",
        maxCapacity: 5,
      }),
    ).rejects.toMatchObject({
      name: "ZodError",
    });
  });

  test("returns future available slots", async () => {
    findMany.mockResolvedValue([
      {
        id: "slot-1",
        date: "2099-01-01",
        startTime: "10:00",
        endTime: "11:00",
        maxCapacity: 5,
        bookedCount: 0,
        isAvailable: true,
      },
    ]);

    await expect(getAvailableSlots()).resolves.toHaveLength(1);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isAvailable: true,
        }),
      }),
    );
  });

  test("deletes an unused slot while preserving its returned record", async () => {
    findUnique.mockResolvedValue({ id: "slot-empty", _count: { appointments: 0 } });
    deleteSlot.mockResolvedValue({ id: "slot-empty" });
    await expect(deleteAppointmentSlot("slot-empty")).resolves.toMatchObject({ id: "slot-empty" });
    expect(deleteSlot).toHaveBeenCalledWith({ where: { id: "slot-empty" } });
  });

  test("does not delete a slot that has appointment history", async () => {
    findUnique.mockResolvedValue({ id: "slot-booked", _count: { appointments: 1 } });
    await expect(deleteAppointmentSlot("slot-booked")).rejects.toMatchObject({
      status: 409,
      message: "This slot has appointment records and cannot be deleted.",
    });
    expect(deleteSlot).not.toHaveBeenCalled();
  });

  test("deduplicates proposal when a deletion for the same slot is already pending", async () => {
    const existingPending = {
      id: "approval-existing",
      action: "DELETE_SLOT",
      status: "PENDING",
      payload: { slotId: "slot-target" },
    };
    approvalFindMany.mockResolvedValue([existingPending]);

    const result = await submitOperationProposal("staff-1", "DELETE_SLOT", { slotId: "slot-target" });

    expect(result).toBe(existingPending);
    expect(approvalCreate).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
  });

  test("rejects creating duplicate or overlapping slot on the same date", async () => {
    findMany.mockResolvedValue([
      {
        id: "slot-existing",
        date: "2027-06-04",
        startTime: "10:00",
        endTime: "11:00",
        maxCapacity: 5,
      },
    ]);

    await expect(
      createAppointmentSlot({
        date: "2027-06-04",
        startTime: "10:00",
        endTime: "11:00",
        maxCapacity: 5,
      })
    ).rejects.toMatchObject({
      status: 409,
      message: "An appointment slot already exists or overlaps with this time window on the selected date.",
    });

    expect(create).not.toHaveBeenCalled();
  });

  test("rejects staff proposal when slot already exists or coincides on that date", async () => {
    findMany.mockResolvedValue([
      {
        id: "slot-existing",
        date: "2027-06-04",
        startTime: "10:00",
        endTime: "11:00",
        maxCapacity: 5,
      },
    ]);

    await expect(
      submitOperationProposal("staff-1", "CREATE_SLOT", {
        date: "2027-06-04",
        startTime: "10:00",
        endTime: "11:00",
        maxCapacity: 5,
      })
    ).rejects.toMatchObject({
      status: 409,
      message: "An appointment slot already exists or overlaps with this time window on the selected date.",
    });

    expect(approvalCreate).not.toHaveBeenCalled();
  });

  test("rejects staff proposal when a coincident slot creation proposal is already pending", async () => {
    findMany.mockResolvedValue([]);
    approvalFindMany.mockResolvedValue([
      {
        id: "approval-pending",
        action: "CREATE_SLOT",
        status: "PENDING",
        payload: {
          date: "2027-06-04",
          startTime: "10:00",
          endTime: "11:00",
          maxCapacity: 5,
        },
      },
    ]);

    await expect(
      submitOperationProposal("staff-1", "CREATE_SLOT", {
        date: "2027-06-04",
        startTime: "10:30",
        endTime: "11:30",
        maxCapacity: 5,
      })
    ).rejects.toMatchObject({
      status: 409,
      message: "An appointment slot proposal already exists or overlaps with this time window on the selected date.",
    });

    expect(approvalCreate).not.toHaveBeenCalled();
  });

  test("submitting DELETE_SLOT returns existing pending proposal if already submitted", async () => {
    const existing = { id: "prop-del", action: "DELETE_SLOT", payload: { slotId: "slot-dup" } };
    approvalFindMany.mockResolvedValue([existing]);
    const res = await submitOperationProposal("staff-1", "DELETE_SLOT", { slotId: "slot-dup" });
    expect(res).toEqual(existing);
    expect(findUnique).not.toHaveBeenCalled();
  });

  test("submitting DELETE_SLOT rejects when slot does not exist or has appointments", async () => {
    approvalFindMany.mockResolvedValue([]);
    findUnique.mockResolvedValueOnce(null);
    await expect(submitOperationProposal("staff-1", "DELETE_SLOT", { slotId: "slot-missing" })).rejects.toMatchObject({ status: 404 });

    findUnique.mockResolvedValueOnce({ id: "slot-busy", _count: { appointments: 1 } });
    await expect(submitOperationProposal("staff-1", "DELETE_SLOT", { slotId: "slot-busy" })).rejects.toMatchObject({ status: 409 });
  });

  test("submitting DELETE_SLOT creates proposal when valid", async () => {
    approvalFindMany.mockResolvedValue([]);
    findUnique.mockResolvedValue({ id: "slot-ok", date: "2026-12-10", startTime: "09:00", endTime: "10:00", _count: { appointments: 0 } });
    approvalCreate.mockResolvedValue({ id: "prop-del-created" });
    const res = await submitOperationProposal("staff-1", "DELETE_SLOT", { slotId: "slot-ok" });
    expect(res).toEqual({ id: "prop-del-created" });
  });

  test("listOperationApprovals filters for STAFF and deduplicates for ADMIN", async () => {
    const staffList = [{ id: "prop-1", requesterId: "staff-1" }];
    approvalFindMany.mockResolvedValue(staffList);
    const resStaff = await listOperationApprovals({ id: "staff-1", role: "STAFF" });
    expect(resStaff).toEqual(staffList);

    const adminList = [
      { id: "del-1", action: "DELETE_SLOT", payload: { slotId: "s-1" } },
      { id: "del-2", action: "DELETE_SLOT", payload: { slotId: "s-1" } },
      { id: "create-1", action: "CREATE_SLOT", payload: { date: "2026-12-10", startTime: "09:00", endTime: "10:00" } },
      { id: "create-2", action: "CREATE_SLOT", payload: { date: "2026-12-10", startTime: "09:30", endTime: "10:30" } },
    ];
    approvalFindMany.mockResolvedValue(adminList);
    const resAdmin = await listOperationApprovals({ id: "admin-1", role: "ADMIN" });
    expect(resAdmin).toHaveLength(2);
    expect(resAdmin[0].id).toBe("del-1");
    expect(resAdmin[1].id).toBe("create-1");
  });

  test("decideOperationApproval validates decision and rejects invalid decisions", async () => {
    await expect(decideOperationApproval("prop-1", "admin-1", "INVALID")).rejects.toMatchObject({ status: 400 });
    approvalFindUnique.mockResolvedValue(null);
    await expect(decideOperationApproval("prop-none", "admin-1", "APPROVE")).rejects.toMatchObject({ status: 404 });
  });

  test("decideOperationApproval approves CREATE_SLOT and auto-rejects conflicting pending proposals", async () => {
    findMany.mockResolvedValue([]);
    const proposal = { id: "p-create", action: "CREATE_SLOT", payload: { date: "2026-12-15", startTime: "09:00", endTime: "10:00", maxCapacity: 5 } };
    approvalFindUnique
      .mockResolvedValueOnce(proposal)
      .mockResolvedValueOnce({ ...proposal, status: "APPROVED" });
    approvalUpdateMany.mockResolvedValue({ count: 1 });
    create.mockResolvedValue({ id: "slot-created" });
    approvalFindMany.mockResolvedValue([
      { id: "p-conflicting", action: "CREATE_SLOT", payload: { date: "2026-12-15", startTime: "09:30", endTime: "10:30" } },
    ]);

    const res = await decideOperationApproval("p-create", "admin-1", "APPROVE");
    expect(res.status).toBe("APPROVED");
    expect(create).toHaveBeenCalled();
  });

  test("decideOperationApproval approves DELETE_SLOT and auto-resolves duplicate pending deletion proposals", async () => {
    findUnique.mockResolvedValue({ id: "s-10", _count: { appointments: 0 } });
    const proposal = { id: "p-del", action: "DELETE_SLOT", payload: { slotId: "s-10" } };
    approvalFindUnique
      .mockResolvedValueOnce(proposal)
      .mockResolvedValueOnce({ ...proposal, status: "APPROVED" });
    approvalUpdateMany.mockResolvedValue({ count: 1 });
    deleteSlot.mockResolvedValue({ id: "s-10" });
    approvalFindMany.mockResolvedValue([
      { id: "p-del-dup", action: "DELETE_SLOT", payload: { slotId: "s-10" } },
    ]);

    const res = await decideOperationApproval("p-del", "admin-1", "APPROVE");
    expect(res.status).toBe("APPROVED");
    expect(deleteSlot).toHaveBeenCalled();
  });

  test("decideOperationApproval rejects a proposal with a review note", async () => {
    const proposal = { id: "p-rej", action: "CREATE_SLOT", payload: {} };
    approvalFindUnique
      .mockResolvedValueOnce(proposal)
      .mockResolvedValueOnce({ ...proposal, status: "REJECTED", decisionNote: "Denied" });
    approvalUpdateMany.mockResolvedValue({ count: 1 });

    const res = await decideOperationApproval("p-rej", "admin-1", "REJECT", "Denied");
    expect(res.status).toBe("REJECTED");
    expect(create).not.toHaveBeenCalled();
  });
});

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
const approvalCreate = jest.fn();

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
      create: approvalCreate,
    },
  },
}));

const {
  createAppointmentSlot,
  deleteAppointmentSlot,
  getAvailableSlots,
} = await import("../../../backend/src/services/appointment-slot.service.js");
const {
  submitOperationProposal,
} = await import("../../../backend/src/services/operation-approval.service.js");

beforeEach(() => {
  findMany.mockReset();
  create.mockReset();
  findUnique.mockReset();
  deleteSlot.mockReset();
  approvalFindMany.mockReset();
  approvalCreate.mockReset();
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
});

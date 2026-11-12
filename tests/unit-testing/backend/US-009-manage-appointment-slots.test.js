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

// Mock Prisma client singleton
jest.unstable_mockModule("../../../backend/src/utils/prisma.js", () => ({
  prisma: {
    appointmentSlot: {
      findMany,
      create,
      findUnique,
      delete: deleteSlot,
    },
  },
}));

const {
  createAppointmentSlot,
  deleteAppointmentSlot,
  getAvailableSlots,
} = await import("../../../backend/src/services/appointment-slot.service.js");

beforeEach(() => {
  findMany.mockReset();
  create.mockReset();
  findUnique.mockReset();
  deleteSlot.mockReset();
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
});

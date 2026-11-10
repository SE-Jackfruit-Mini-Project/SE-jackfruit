/**
 * @file US-009-manage-appointment-slots.test.js
 * @description Unit test suite for US-009: Manage Appointment Slots.
 * Tests past-date slot rejection, invalid time range validation (endTime <= startTime),
 * and filtering of future available appointment slots.
 */

import { jest } from "@jest/globals";

const findMany = jest.fn();
const create = jest.fn();

// Mock Prisma client singleton
jest.unstable_mockModule("../../../backend/src/utils/prisma.js", () => ({
  prisma: {
    appointmentSlot: {
      findMany,
      create,
    },
  },
}));

const {
  createAppointmentSlot,
  getAvailableSlots,
} = await import("../../../backend/src/services/appointment-slot.service.js");

beforeEach(() => {
  findMany.mockReset();
  create.mockReset();
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
});

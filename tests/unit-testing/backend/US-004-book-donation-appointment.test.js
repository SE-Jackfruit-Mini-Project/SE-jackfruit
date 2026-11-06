
import { jest } from "@jest/globals";

const findUnique = jest.fn();
const findFirst = jest.fn();
const transaction = jest.fn();

jest.unstable_mockModule("../../../backend/src/utils/prisma.js", () => ({
  prisma: {
    appointmentSlot: { findUnique },
    appointment: { findFirst },
    $transaction: transaction,
  },
}));

const { bookAppointment } = await import(
  "../../../backend/src/services/appointment.service.js"
);

beforeEach(() => {
  findUnique.mockReset();
  findFirst.mockReset();
  transaction.mockReset();
});

describe("US-004 book donation appointment", () => {
  test("rejects a missing appointment slot", async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      bookAppointment("donor-1", { slotId: "missing-slot" }),
    ).rejects.toMatchObject({
      status: 404,
    });
  });

  test("rejects a full appointment slot", async () => {
    findUnique.mockResolvedValue({
      id: "slot-1",
      bookedCount: 5,
      maxCapacity: 5,
      isAvailable: true,
    });

    await expect(
      bookAppointment("donor-1", { slotId: "slot-1" }),
    ).rejects.toMatchObject({
      status: 400,
    });
  });

  test("rejects a duplicate scheduled booking", async () => {
    findUnique.mockResolvedValue({
      id: "slot-1",
      bookedCount: 0,
      maxCapacity: 5,
      isAvailable: true,
    });

    findFirst.mockResolvedValue({
      id: "appointment-1",
      status: "SCHEDULED",
    });

    await expect(
      bookAppointment("donor-1", { slotId: "slot-1" }),
    ).rejects.toMatchObject({
      status: 400,
    });
  });
});

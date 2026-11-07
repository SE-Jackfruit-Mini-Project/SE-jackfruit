import { jest } from "@jest/globals";

const appointmentFindMany = jest.fn();
const appointmentFindFirst = jest.fn();
const appointmentFindUnique = jest.fn();
const appointmentUpdate = jest.fn();
const appointmentUpdateMany = jest.fn();

const slotFindUnique = jest.fn();
const slotUpdateMany = jest.fn();

const transaction = jest.fn();

jest.unstable_mockModule("../../../backend/src/utils/prisma.js", () => ({
  prisma: {
    appointment: {
      findMany: appointmentFindMany,
    },
    $transaction: transaction,
  },
}));

const {
  getDonorAppointments,
  rescheduleDonorAppointment,
  cancelDonorAppointment,
} = await import(
  "../../../backend/src/services/appointment-management.service.js"
);

function makeAppointment() {
  return {
    id: "appointment-1",
    donorId: "donor-1",
    slotId: "old-slot",
    status: "SCHEDULED",
    notes: "Test appointment",
    slot: {
      id: "old-slot",
      date: "2099-01-01",
      startTime: "10:00",
      endTime: "11:00",
      maxCapacity: 5,
      bookedCount: 1,
      isAvailable: true,
    },
  };
}

function makeNewSlot() {
  return {
    id: "new-slot",
    date: "2099-01-02",
    startTime: "12:00",
    endTime: "13:00",
    maxCapacity: 5,
    bookedCount: 1,
    isAvailable: true,
  };
}

beforeEach(() => {
  appointmentFindMany.mockReset();
  appointmentFindFirst.mockReset();
  appointmentFindUnique.mockReset();
  appointmentUpdate.mockReset();
  appointmentUpdateMany.mockReset();

  slotFindUnique.mockReset();
  slotUpdateMany.mockReset();

  transaction.mockReset();

  transaction.mockImplementation(async (callback) =>
    callback({
      appointment: {
        findFirst: appointmentFindFirst,
        findUnique: appointmentFindUnique,
        update: appointmentUpdate,
        updateMany: appointmentUpdateMany,
      },
      appointmentSlot: {
        findUnique: slotFindUnique,
        updateMany: slotUpdateMany,
      },
    })
  );
});

describe("US-013 manage donor appointments", () => {
  test("returns appointments belonging to the specified donor", async () => {
    const appointments = [makeAppointment()];

    appointmentFindMany.mockResolvedValue(appointments);

    await expect(getDonorAppointments("donor-1")).resolves.toEqual(
      appointments
    );

    expect(appointmentFindMany).toHaveBeenCalledWith({
      where: { donorId: "donor-1" },
      include: { slot: true },
      orderBy: [{ createdAt: "desc" }],
    });
  });

  test("reschedules an appointment and updates both slot capacities", async () => {
    const appointment = makeAppointment();
    const newSlot = makeNewSlot();

    const updatedAppointment = {
      ...appointment,
      slotId: "new-slot",
      slot: newSlot,
    };

    appointmentFindFirst
      .mockResolvedValueOnce(appointment)
      .mockResolvedValueOnce(null);

    slotFindUnique.mockResolvedValue(newSlot);

    slotUpdateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });

    appointmentUpdate.mockResolvedValue(updatedAppointment);

    await expect(
      rescheduleDonorAppointment("donor-1", "appointment-1", {
        slotId: "new-slot",
      })
    ).resolves.toEqual(updatedAppointment);

    expect(slotUpdateMany).toHaveBeenCalledTimes(2);

    expect(slotUpdateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          id: "new-slot",
          isAvailable: true,
        }),
        data: { bookedCount: { increment: 1 } },
      })
    );

    expect(slotUpdateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          id: "old-slot",
        }),
        data: {
          bookedCount: { decrement: 1 },
          isAvailable: true,
        },
      })
    );

    expect(appointmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "appointment-1" },
        data: { slotId: "new-slot" },
      })
    );
  });

  test("rejects rescheduling when the selected slot is unavailable", async () => {
    appointmentFindFirst.mockResolvedValueOnce(makeAppointment());

    slotFindUnique.mockResolvedValue({
      ...makeNewSlot(),
      isAvailable: false,
      bookedCount: 5,
      maxCapacity: 5,
    });

    await expect(
      rescheduleDonorAppointment("donor-1", "appointment-1", {
        slotId: "new-slot",
      })
    ).rejects.toMatchObject({
      message: "The selected slot is no longer available.",
      status: 409,
    });

    expect(slotUpdateMany).not.toHaveBeenCalled();
    expect(appointmentUpdate).not.toHaveBeenCalled();
  });

  test("cancels a scheduled appointment and releases its slot capacity", async () => {
    const appointment = makeAppointment();

    const cancelledAppointment = {
      ...appointment,
      status: "CANCELLED",
    };

    appointmentFindFirst.mockResolvedValue(appointment);
    appointmentUpdateMany.mockResolvedValue({ count: 1 });
    slotUpdateMany.mockResolvedValue({ count: 1 });
    appointmentFindUnique.mockResolvedValue(cancelledAppointment);

    await expect(
      cancelDonorAppointment("donor-1", "appointment-1")
    ).resolves.toEqual(cancelledAppointment);

    expect(appointmentUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "appointment-1",
        donorId: "donor-1",
        status: "SCHEDULED",
      },
      data: { status: "CANCELLED" },
    });

    expect(slotUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "old-slot",
          bookedCount: { gt: 0 },
        },
        data: {
          bookedCount: { decrement: 1 },
          isAvailable: true,
        },
      })
    );
  });

  test("does not allow a donor to cancel another donor's appointment", async () => {
    appointmentFindFirst.mockResolvedValue(null);

    await expect(
      cancelDonorAppointment("donor-2", "appointment-1")
    ).rejects.toMatchObject({
      message: "Appointment not found.",
      status: 404,
    });

    expect(appointmentUpdateMany).not.toHaveBeenCalled();
    expect(slotUpdateMany).not.toHaveBeenCalled();
  });

  test("rejects rescheduling to the same slot", async () => {
    appointmentFindFirst.mockResolvedValue(makeAppointment());

    await expect(
      rescheduleDonorAppointment("donor-1", "appointment-1", {
        slotId: "old-slot",
      })
    ).rejects.toMatchObject({
      message: "Choose a different appointment slot.",
      status: 400,
    });

    expect(slotFindUnique).not.toHaveBeenCalled();
    expect(slotUpdateMany).not.toHaveBeenCalled();
  });
});
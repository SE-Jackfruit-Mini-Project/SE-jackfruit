/**
 * @file US-013-manage-donor-appointments.test.js
 * @description Unit test suite for US-013: Manage Donor Appointments.
 * Tests donor appointment listing, slot rescheduling with atomic capacity increment/decrement,
 * rejection of unavailable/overbooked target slots, appointment cancellation with slot release,
 * cross-donor access control protection, and same-slot rescheduling rejection.
 */

import { jest } from "@jest/globals";

const appointmentFindMany = jest.fn();
const appointmentFindFirst = jest.fn();
const appointmentFindUnique = jest.fn();
const appointmentUpdate = jest.fn();
const appointmentUpdateMany = jest.fn();
const donationFindMany = jest.fn();

const slotFindUnique = jest.fn();
const slotUpdateMany = jest.fn();

const transaction = jest.fn();

// Mock Prisma client singleton
jest.unstable_mockModule("../../../backend/src/utils/prisma.js", () => ({
  prisma: {
    appointment: {
      findMany: appointmentFindMany,
    },
    donation: { findMany: donationFindMany },
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

const { listStaffAppointments, updateStaffAppointmentStatus } = await import("../../../backend/src/services/staff-appointment.service.js");

/** Helper creating a mock appointment object */
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

/** Helper creating a mock slot object */
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
  donationFindMany.mockReset();
  donationFindMany.mockResolvedValue([]);
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

    await expect(getDonorAppointments("donor-1")).resolves.toEqual([
      { ...appointments[0], donationRecordedOnDate: false },
    ]);

    expect(appointmentFindMany).toHaveBeenCalledWith({
      where: { donorId: "donor-1" },
      include: { slot: true },
      orderBy: [{ createdAt: "desc" }],
    });
    expect(donationFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ donorId: "donor-1" }),
    }));
  });

  test("flags a donation recorded on an appointment date", async () => {
    appointmentFindMany.mockResolvedValue([makeAppointment()]);
    donationFindMany.mockResolvedValue([{ donationDate: new Date("2099-01-01T00:00:00.000Z") }]);

    await expect(getDonorAppointments("donor-1")).resolves.toMatchObject([
      { id: "appointment-1", donationRecordedOnDate: true },
    ]);
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

  test("staff list validates filters, paginates and selects no donor credentials", async () => {
    appointmentFindMany.mockResolvedValue([{ id: "a1" }, { id: "a2" }, { id: "a3" }]);
    await expect(listStaffAppointments({ status: "SCHEDULED", page: "2", limit: "2" }))
      .resolves.toEqual({ appointments: [{ id: "a1" }, { id: "a2" }], hasMore: true });
    expect(appointmentFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: "SCHEDULED" }, skip: 2, take: 3,
      select: expect.objectContaining({ donor: { select: { id: true, fullName: true, email: true, bloodGroup: true } } }),
    }));
  });

  test.each([{ status: "UNKNOWN" }, { page: "0" }, { limit: "101" }])("rejects invalid staff appointment filters %j", async query => {
    await expect(listStaffAppointments(query)).rejects.toMatchObject({ name: "ZodError" });
    expect(appointmentFindMany).not.toHaveBeenCalled();
  });

  test("staff cancellation claims scheduled appointment and releases capacity once", async () => {
    appointmentFindUnique.mockResolvedValueOnce(makeAppointment()).mockResolvedValueOnce({ id: "appointment-1", status: "CANCELLED", slotId: "old-slot" });
    appointmentUpdateMany.mockResolvedValue({ count: 1 }); slotUpdateMany.mockResolvedValue({ count: 1 });
    await expect(updateStaffAppointmentStatus("appointment-1", { status: "CANCELLED" })).resolves.toMatchObject({ status: "CANCELLED" });
    expect(appointmentUpdateMany).toHaveBeenCalledWith({ where: { id: "appointment-1", status: "SCHEDULED", slotId: "old-slot" }, data: { status: "CANCELLED" } });
    expect(slotUpdateMany).toHaveBeenCalledTimes(1);
  });

  test("lost staff cancellation claim never releases capacity", async () => {
    appointmentFindUnique.mockResolvedValue(makeAppointment()); appointmentUpdateMany.mockResolvedValue({ count: 0 });
    await expect(updateStaffAppointmentStatus("appointment-1", { status: "CANCELLED" })).rejects.toMatchObject({ status: 409 });
    expect(slotUpdateMany).not.toHaveBeenCalled();
  });

  test.each(["COMPLETED", "CANCELLED"])("staff cannot cancel a %s appointment", async status => {
    appointmentFindUnique.mockResolvedValue({ ...makeAppointment(), status });
    await expect(updateStaffAppointmentStatus("appointment-1", { status: "CANCELLED" })).rejects.toMatchObject({ status: 409 });
    expect(appointmentUpdateMany).not.toHaveBeenCalled();
  });

  test("staff cancellation reports missing appointment and capacity conflicts", async () => {
    appointmentFindUnique.mockResolvedValueOnce(null);
    await expect(updateStaffAppointmentStatus("missing", { status: "CANCELLED" })).rejects.toMatchObject({ status: 404 });
    appointmentFindUnique.mockResolvedValueOnce(makeAppointment()); appointmentUpdateMany.mockResolvedValue({ count: 1 }); slotUpdateMany.mockResolvedValue({ count: 0 });
    await expect(updateStaffAppointmentStatus("appointment-1", { status: "CANCELLED" })).rejects.toMatchObject({ status: 409 });
  });

  test.each(["COMPLETED", "SCHEDULED"])("staff cannot bypass donation intake or booking using status %s", async status => {
    await expect(updateStaffAppointmentStatus("appointment-1", { status })).rejects.toMatchObject({ status: 409 });
    expect(transaction).not.toHaveBeenCalled();
  });

});

/**
 * @file US-004-book-donation-appointment.test.js
 * @description Unit test suite for US-004: Book Donation Appointment.
 * Tests appointment booking, capacity and duplicate checks, plus donor age, gender interval,
 * and per-booking weight eligibility.
 */

import { jest } from "@jest/globals";

const findUnique = jest.fn();
const findFirst = jest.fn();
const findDonor = jest.fn();
const findDonation = jest.fn();
const createAppointment = jest.fn();
const updateSlot = jest.fn();
const transaction = jest.fn();

const tx = {
  appointment: { create: createAppointment },
  appointmentSlot: { update: updateSlot },
};

// Mock Prisma client singleton
jest.unstable_mockModule("../../../backend/src/utils/prisma.js", () => ({
  prisma: {
    user: { findUnique: findDonor },
    donation: { findFirst: findDonation },
    appointmentSlot: { findUnique },
    appointment: { findFirst },
    $transaction: transaction,
  },
}));

const { bookAppointment } = await import(
  "../../../backend/src/services/appointment.service.js"
);

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-11-10T12:00:00.000Z"));
  findUnique.mockReset();
  findFirst.mockReset();
  findDonation.mockReset();
  findDonor.mockReset();
  createAppointment.mockReset();
  updateSlot.mockReset();
  findDonor.mockResolvedValue({
    role: "DONOR",
    dateOfBirth: new Date("1995-06-15T00:00:00.000Z"),
    gender: "FEMALE",
  });
  findFirst.mockResolvedValue(null);
  findDonation.mockResolvedValue(null);
  transaction.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

const SLOT = {
  id: "slot-1",
  isAvailable: true,
  bookedCount: 0,
  maxCapacity: 10,
};

function donor({ dateOfBirth = "1995-06-15", gender = "FEMALE" } = {}) {
  return {
    role: "DONOR",
    dateOfBirth: dateOfBirth ? new Date(`${dateOfBirth}T00:00:00.000Z`) : null,
    gender,
  };
}

function prepareSuccessfulBooking() {
  findDonor.mockResolvedValue(donor());
  findFirst.mockResolvedValue(null);
  findUnique.mockResolvedValue(SLOT);
  createAppointment.mockResolvedValue({ id: "appointment-1", weightKg: 57.5, slot: SLOT });
  updateSlot.mockResolvedValue({});
  transaction.mockImplementation((callback) => callback(tx));
}

describe("US-004 book donation appointment", () => {
  test("rejects a missing appointment slot", async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      bookAppointment("donor-1", { slotId: "missing-slot", weightKg: 60 }),
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
      bookAppointment("donor-1", { slotId: "slot-1", weightKg: 60 }),
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

    findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: "appointment-1",
      status: "SCHEDULED",
    });

    await expect(
      bookAppointment("donor-1", { slotId: "slot-1", weightKg: 60 }),
    ).rejects.toMatchObject({
      status: 400,
    });
  });

  test("accepts an 18-year-old at 45 kg and stores the submitted weight", async () => {
    prepareSuccessfulBooking();
    findDonor.mockResolvedValue(donor({ dateOfBirth: "2008-11-10", gender: "FEMALE" }));

    await bookAppointment("donor-1", { slotId: "slot-1", weightKg: 45 });

    expect(createAppointment).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ donorId: "donor-1", weightKg: 45 }),
    }));
  });

  test.each([
    ["under 18", "2009-11-10"],
    ["over 65", "1960-11-09"],
  ])("rejects a donor who is %s", async (_description, dateOfBirth) => {
    prepareSuccessfulBooking();
    findDonor.mockResolvedValue(donor({ dateOfBirth }));

    await expect(bookAppointment("donor-1", { slotId: "slot-1", weightKg: 60 }))
      .rejects.toMatchObject({ status: 400, message: expect.stringContaining("18 and 65") });
    expect(createAppointment).not.toHaveBeenCalled();
  });

  test("accepts a donor exactly 65 years old", async () => {
    prepareSuccessfulBooking();
    findDonor.mockResolvedValue(donor({ dateOfBirth: "1961-11-10", gender: "MALE" }));

    await expect(bookAppointment("donor-1", { slotId: "slot-1", weightKg: 45 }))
      .resolves.toMatchObject({ id: "appointment-1" });
  });

  test("rejects weight below 45 kg", async () => {
    prepareSuccessfulBooking();

    await expect(bookAppointment("donor-1", { slotId: "slot-1", weightKg: 44.9 }))
      .rejects.toMatchObject({ name: "ZodError" });
    expect(createAppointment).not.toHaveBeenCalled();
  });

  test("requires a weight on every booking", async () => {
    prepareSuccessfulBooking();

    await expect(bookAppointment("donor-1", { slotId: "slot-1" }))
      .rejects.toMatchObject({ name: "ZodError" });
    expect(createAppointment).not.toHaveBeenCalled();
  });

  test("requires date of birth and gender before booking", async () => {
    prepareSuccessfulBooking();
    findDonor.mockResolvedValue(donor({ dateOfBirth: null, gender: null }));

    await expect(bookAppointment("donor-1", { slotId: "slot-1", weightKg: 60 }))
      .rejects.toMatchObject({ status: 400, message: expect.stringContaining("Complete your date of birth") });
    expect(findUnique).not.toHaveBeenCalled();
  });

  test("enforces the female four-month wait", async () => {
    prepareSuccessfulBooking();
    findDonation.mockResolvedValue({ donationDate: new Date("2026-07-11T00:00:00.000Z") });

    await expect(bookAppointment("donor-1", { slotId: "slot-1", weightKg: 60 }))
      .rejects.toMatchObject({ status: 400, message: expect.stringContaining("2026-11-11") });
    expect(findUnique).not.toHaveBeenCalled();
  });

  test("allows a female donor to book after four calendar months", async () => {
    prepareSuccessfulBooking();
    findDonation.mockResolvedValue({ donationDate: new Date("2026-07-10T00:00:00.000Z") });

    await expect(bookAppointment("donor-1", { slotId: "slot-1", weightKg: 60 }))
      .resolves.toMatchObject({ id: "appointment-1" });
  });

  test("enforces the male three-month wait", async () => {
    prepareSuccessfulBooking();
    findDonor.mockResolvedValue(donor({ gender: "MALE" }));
    findDonation.mockResolvedValue({ donationDate: new Date("2026-08-11T00:00:00.000Z") });

    await expect(bookAppointment("donor-1", { slotId: "slot-1", weightKg: 60 }))
      .rejects.toMatchObject({ status: 400, message: expect.stringContaining("2026-11-11") });
    expect(findUnique).not.toHaveBeenCalled();
  });

  test("allows a male donor to book after three calendar months", async () => {
    prepareSuccessfulBooking();
    findDonor.mockResolvedValue(donor({ gender: "MALE" }));
    findDonation.mockResolvedValue({ donationDate: new Date("2026-08-10T00:00:00.000Z") });

    await expect(bookAppointment("donor-1", { slotId: "slot-1", weightKg: 60 }))
      .resolves.toMatchObject({ id: "appointment-1" });
  });

  test("does not apply a waiting period when the donor only booked or cancelled an appointment", async () => {
    prepareSuccessfulBooking();
    findDonation.mockResolvedValue(null);

    await expect(bookAppointment("donor-1", { slotId: "slot-1", weightKg: 60 }))
      .resolves.toMatchObject({ id: "appointment-1" });
    expect(findDonation).toHaveBeenCalledWith(expect.objectContaining({
      where: { donorId: "donor-1", accepted: true },
      select: { donationDate: true },
    }));
  });
});

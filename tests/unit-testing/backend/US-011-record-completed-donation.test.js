/**
 * @file US-011-record-completed-donation.test.js
 * @description Unit test suite for US-011: Record Completed Blood Donation.
 * Verifies staff selection of registered donors, recent donation inquiries,
 * atomic updates of blood inventory on accepted donations, rejection handling without inventory mutations,
 * and rejection of unregistered donors or invalid unit quantities.
 */

import { jest } from "@jest/globals";

const userFindMany = jest.fn();
const userFindFirst = jest.fn();
const userFindUnique = jest.fn();
const donationFindMany = jest.fn();
const donationFindFirst = jest.fn();
const donationCreate = jest.fn();
const appointmentFindMany = jest.fn();
const appointmentFindFirst = jest.fn();
const appointmentUpdate = jest.fn();
const inventoryUpsert = jest.fn();
const inventoryUpdate = jest.fn();
const movementCreate = jest.fn();
const transaction = jest.fn();

// Mock Prisma client singleton
jest.unstable_mockModule(
  "../../../backend/src/utils/prisma.js",
  () => ({
    prisma: {
      user: {
        findMany: userFindMany,
        findFirst: userFindFirst,
        findUnique: userFindUnique,
      },
      donation: {
        findMany: donationFindMany,
        findFirst: donationFindFirst,
      },
      appointment: {
        findFirst: appointmentFindFirst,
        findMany: appointmentFindMany,
      },
      $transaction: transaction,
    },
  })
);

// Mock inventory service helper
jest.unstable_mockModule(
  "../../../backend/src/services/inventory.service.js",
  () => ({
    deriveStatus: jest.fn((units) => {
      if (units <= 0) return "OUT_OF_STOCK";
      if (units <= 5) return "LOW";
      return "AVAILABLE";
    }),
  })
);

const {
  getRegisteredDonors,
  getRecentDonations,
  recordCompletedDonation,
} = await import("../../../backend/src/services/donation.service.js");

beforeEach(() => {
  userFindMany.mockReset();
  userFindFirst.mockReset();
  userFindUnique.mockReset().mockResolvedValue(null);
  donationFindMany.mockReset();
  donationFindFirst.mockReset().mockResolvedValue(null);
  donationCreate.mockReset();
  appointmentFindFirst.mockReset().mockResolvedValue(null);
  appointmentFindMany.mockReset().mockResolvedValue([{ id: "appointment-1", status: "SCHEDULED", slot: { date: "2026-01-15" } }]);
  appointmentUpdate.mockReset().mockResolvedValue({ count: 1 });
  inventoryUpsert.mockReset();
  inventoryUpdate.mockReset();
  movementCreate.mockReset();
  transaction.mockReset();

  transaction.mockImplementation(async (callback) =>
    callback({
      user: { findFirst: userFindFirst },
      donation: { create: donationCreate, findFirst: donationFindFirst },
      appointment: { findMany: appointmentFindMany, updateMany: appointmentUpdate },
      inventory: {
        upsert: inventoryUpsert,
        update: inventoryUpdate,
      },
      inventoryMovement: { create: movementCreate },
    })
  );
});

describe("US-011 record completed blood donation", () => {
  test("returns registered donors only", async () => {
    const donors = [
      { id: "donor-1", fullName: "Test Donor", email: "donor@test.com", bloodGroup: "O_POSITIVE" },
    ];

    userFindMany.mockResolvedValue(donors);
    appointmentFindFirst.mockResolvedValue({ id: "app-1", slot: { date: "2026-01-15" } });
    donationFindFirst.mockResolvedValue(null);

    await expect(getRegisteredDonors()).resolves.toEqual(donors);

    expect(userFindMany).toHaveBeenCalledWith({
      where: {
        role: "DONOR",
        bloodGroup: { not: null },
        appointments: { some: {} },
      },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        bloodGroup: true,
      },
    });
  });

  test("getRegisteredDonors filters out donors without active scheduled appointment", async () => {
    userFindMany.mockResolvedValue([{ id: "donor-1", fullName: "Test" }]);
    appointmentFindFirst.mockResolvedValue(null);
    const result = await getRegisteredDonors();
    expect(result).toEqual([]);
  });

  test("getRegisteredDonors filters out donors when blood already drawn on slot date", async () => {
    userFindMany.mockResolvedValue([{ id: "donor-1", fullName: "Test" }]);
    appointmentFindFirst.mockResolvedValue({ id: "app-1", slot: { date: "2026-01-15" } });
    donationFindFirst.mockResolvedValueOnce({ id: "don-existing" });
    const result = await getRegisteredDonors();
    expect(result).toEqual([]);
  });

  test("getRegisteredDonors filters out donors with active gender cooldown and includes eligible donors", async () => {
    userFindMany.mockResolvedValue([
      { id: "donor-female", fullName: "Female Donor" },
      { id: "donor-eligible", fullName: "Eligible Donor" },
    ]);
    appointmentFindFirst
      .mockResolvedValueOnce({ id: "app-1", slot: { date: "2026-01-15" } })
      .mockResolvedValueOnce({ id: "app-2", slot: { date: "2026-01-15" } });
    userFindUnique
      .mockResolvedValueOnce({ gender: "FEMALE" })
      .mockResolvedValueOnce({ gender: "MALE" });
    donationFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ donationDate: new Date(Date.now() - 30 * 24 * 3600 * 1000) })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await getRegisteredDonors();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("donor-eligible");
  });

  test("returns recent donations with donor and recorder details", async () => {
    const donations = [{ id: "donation-1" }];

    donationFindMany.mockResolvedValue(donations);

    await expect(getRecentDonations()).resolves.toEqual(donations);

    expect(donationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
        include: expect.objectContaining({
          donor: expect.any(Object),
          recordedBy: expect.any(Object),
        }),
      })
    );
  });

  test("records an accepted donation and updates inventory", async () => {
    const savedDonation = {
      id: "donation-1",
      donorId: "donor-1",
      recordedById: "staff-1",
      bloodGroup: "O_POSITIVE",
      units: 7,
      accepted: true,
    };

    userFindFirst.mockResolvedValue({ id: "donor-1", bloodGroup: "O_POSITIVE" });
    donationCreate.mockResolvedValue(savedDonation);

    inventoryUpsert.mockResolvedValue({
      id: "inventory-1",
      bloodGroup: "O_POSITIVE",
      availableUnits: 7,
      status: "LOW",
    });

    inventoryUpdate.mockResolvedValue({
      id: "inventory-1",
      bloodGroup: "O_POSITIVE",
      availableUnits: 7,
      status: "AVAILABLE",
    });

    movementCreate.mockResolvedValue({ id: "movement-1" });

    await expect(
      recordCompletedDonation("staff-1", {
        donorId: "donor-1",
        units: 7,
        donationDate: "2026-01-15",
        accepted: true,
        notes: "Test donation",
      })
    ).resolves.toEqual({
      donation: savedDonation,
      inventoryUpdated: true,
    });

    expect(donationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          donorId: "donor-1",
          recordedById: "staff-1",
          bloodGroup: "O_POSITIVE",
          units: 7,
          accepted: true,
        }),
      })
    );

    expect(inventoryUpsert).toHaveBeenCalled();
    expect(inventoryUpdate).toHaveBeenCalledWith({
      where: { id: "inventory-1" },
      data: { status: "AVAILABLE" },
    });

    expect(movementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        inventoryId: "inventory-1",
        type: "DONATION",
        delta: 7,
        referenceId: "donation-1",
        actorId: "staff-1",
      }),
    });
  });

  test("records a rejected donation without changing inventory", async () => {
    const savedDonation = {
      id: "donation-2",
      donorId: "donor-1",
      accepted: false,
    };

    userFindFirst.mockResolvedValue({ id: "donor-1", bloodGroup: "A_POSITIVE" });
    donationCreate.mockResolvedValue(savedDonation);

    await expect(
      recordCompletedDonation("staff-1", {
        donorId: "donor-1",
        units: 2,
        donationDate: "2026-01-15",
        accepted: false,
      })
    ).resolves.toEqual({
      donation: savedDonation,
      inventoryUpdated: false,
    });

    expect(donationCreate).toHaveBeenCalled();
    expect(inventoryUpsert).not.toHaveBeenCalled();
    expect(inventoryUpdate).not.toHaveBeenCalled();
    expect(movementCreate).not.toHaveBeenCalled();
  });

  test("rejects invalid donation quantities", async () => {
    await expect(
      recordCompletedDonation("staff-1", {
        donorId: "donor-1",
        units: 0,
        donationDate: "2026-01-15",
        accepted: true,
      })
    ).rejects.toMatchObject({
      name: "ZodError",
    });

    expect(transaction).not.toHaveBeenCalled();
  });

  test("rejects a donor who is not registered", async () => {
    userFindFirst.mockResolvedValue(null);

    await expect(
      recordCompletedDonation("staff-1", {
        donorId: "unknown-donor",
        units: 2,
        donationDate: "2026-01-15",
        accepted: true,
      })
    ).rejects.toMatchObject({
      message: "The selected donor must have a saved blood group and an appointment.",
      status: 404,
    });

    expect(donationCreate).not.toHaveBeenCalled();
    expect(inventoryUpsert).not.toHaveBeenCalled();
  });

  test("rejects drawing blood from the same person for the same slot more than once", async () => {
    userFindFirst.mockResolvedValue({ id: "donor-1", bloodGroup: "A_POSITIVE", gender: "MALE" });
    donationFindFirst.mockResolvedValueOnce({ id: "donation-prior", donationDate: new Date("2026-01-15T00:00:00.000Z") });

    await expect(
      recordCompletedDonation("staff-1", {
        donorId: "donor-1",
        units: 1,
        donationDate: "2026-01-15",
        accepted: true,
      })
    ).rejects.toMatchObject({
      message: "Blood has already been drawn from this donor for this appointment slot.",
      status: 400,
    });

    expect(donationCreate).not.toHaveBeenCalled();
  });

  test("rejects drawing blood before the gender-based waiting period has elapsed", async () => {
    userFindFirst.mockResolvedValue({ id: "donor-1", bloodGroup: "A_POSITIVE", gender: "MALE" });
    appointmentFindMany.mockResolvedValue([{ id: "appointment-1", status: "SCHEDULED", slot: { date: "2026-02-01" } }]);
    // First call to donationFindFirst checks same slot (returns null)
    // Second call to donationFindFirst checks previous accepted donation
    donationFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "prev-donation", donationDate: new Date("2026-01-01T00:00:00.000Z"), accepted: true });

    await expect(
      recordCompletedDonation("staff-1", {
        donorId: "donor-1",
        units: 1,
        donationDate: "2026-02-01",
        accepted: true,
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining("waiting period for their gender"),
      status: 400,
    });

    expect(donationCreate).not.toHaveBeenCalled();
  });

  test("marks the scheduled appointment as completed when donation is recorded", async () => {
    userFindFirst.mockResolvedValue({ id: "donor-1", bloodGroup: "O_POSITIVE", gender: "FEMALE" });
    appointmentFindMany.mockResolvedValue([{ id: "appointment-42", status: "SCHEDULED", slot: { date: "2026-01-15" } }]);
    donationCreate.mockResolvedValue({ id: "donation-42", accepted: true });
    inventoryUpsert.mockResolvedValue({ id: "inv-1", bloodGroup: "O_POSITIVE", availableUnits: 1, status: "LOW" });
    inventoryUpdate.mockResolvedValue({ id: "inv-1", bloodGroup: "O_POSITIVE", availableUnits: 1, status: "LOW" });
    movementCreate.mockResolvedValue({ id: "mov-1" });

    await recordCompletedDonation("staff-1", {
      donorId: "donor-1",
      units: 1,
      donationDate: "2026-01-15",
      accepted: true,
    });

    expect(appointmentUpdate).toHaveBeenCalledWith({
      where: { id: "appointment-42", donorId: "donor-1", status: "SCHEDULED" },
      data: { status: "COMPLETED" },
    });
  });
});

test("rejects donation dates without a matching scheduled appointment and performs no writes", async () => {
  userFindFirst.mockResolvedValue({ id: "donor-1", bloodGroup: "O_POSITIVE" });
  await expect(recordCompletedDonation("staff-1", { donorId: "donor-1", units: 1, donationDate: "2026-01-16", accepted: false })).rejects.toMatchObject({ status: 400 });
  expect(donationCreate).not.toHaveBeenCalled(); expect(appointmentUpdate).not.toHaveBeenCalled();
});
test("completes only the appointment matching the donation date", async () => {
  userFindFirst.mockResolvedValue({ id: "donor-1", bloodGroup: "O_POSITIVE" });
  appointmentFindMany.mockResolvedValue([{ id: "wrong", status: "SCHEDULED", slot: { date: "2026-01-14" } }, { id: "right", status: "SCHEDULED", slot: { date: "2026-01-15" } }]);
  donationCreate.mockResolvedValue({ id: "donation-1" });
  await recordCompletedDonation("staff-1", { donorId: "donor-1", units: 1, donationDate: "2026-01-15", accepted: false });
  expect(appointmentUpdate).toHaveBeenCalledWith({ where: { id: "right", donorId: "donor-1", status: "SCHEDULED" }, data: { status: "COMPLETED" } });
});
test("a concurrent intake claim prevents duplicate donation and inventory writes", async () => {
  userFindFirst.mockResolvedValue({ id: "donor-1", bloodGroup: "O_POSITIVE" }); appointmentUpdate.mockResolvedValue({ count: 0 });
  await expect(recordCompletedDonation("staff-1", { donorId: "donor-1", units: 1, donationDate: "2026-01-15", accepted: true })).rejects.toMatchObject({ status: 409 });
  expect(donationCreate).not.toHaveBeenCalled(); expect(inventoryUpsert).not.toHaveBeenCalled(); expect(movementCreate).not.toHaveBeenCalled();
});

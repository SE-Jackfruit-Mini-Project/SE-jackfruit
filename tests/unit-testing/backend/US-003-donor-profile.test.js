/**
 * @file US-003-donor-profile.test.js
 * @description Unit test suite for US-003: Donor Profile Management.
 * Verifies that profile queries only retrieve records with role 'DONOR', restricts full name
 * updates to verified donor accounts, and ignores unauthorized profile modifications.
 */

import { jest } from "@jest/globals";

const findFirst = jest.fn();
const updateMany = jest.fn();

// Mock Prisma client singleton
jest.unstable_mockModule("../../../backend/src/utils/prisma.js", () => ({
  prisma: { user: { findFirst, updateMany } },
}));

const { getDonorProfile, updateDonorProfile } = await import("../../../backend/src/services/donor-profile.service.js");

beforeEach(() => {
  findFirst.mockReset();
  updateMany.mockReset();
});

describe("US-003 donor profile", () => {
  test("retrieves only the authenticated donor profile", async () => {
    const profile = { id: "donor-1", fullName: "Test Donor", role: "DONOR" };
    findFirst.mockResolvedValue(profile);
    await expect(getDonorProfile("donor-1")).resolves.toEqual(profile);
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "donor-1", role: "DONOR" },
    }));
  });

  test("updates the permitted full name field", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    findFirst.mockResolvedValue({ id: "donor-1", fullName: "Updated Donor", role: "DONOR" });
    await expect(updateDonorProfile("donor-1", "Updated Donor"))
      .resolves.toMatchObject({ fullName: "Updated Donor" });
  });

  test("returns null for a non-donor account", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await expect(updateDonorProfile("staff-1", "Changed")).resolves.toBeNull();
  });

  test("records blood group once for an existing donor profile", async () => {
    findFirst
      .mockResolvedValueOnce({ dateOfBirth: null, gender: null, bloodGroup: null })
      .mockResolvedValueOnce({ id: "donor-1", fullName: "Test Donor", bloodGroup: "AB_NEGATIVE" });
    updateMany.mockResolvedValue({ count: 1 });

    await expect(updateDonorProfile("donor-1", { bloodGroup: "AB_NEGATIVE" }))
      .resolves.toMatchObject({ bloodGroup: "AB_NEGATIVE" });
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ bloodGroup: null }),
      data: { bloodGroup: "AB_NEGATIVE" },
    }));
  });

  test("does not allow a saved blood group to be changed", async () => {
    findFirst.mockResolvedValue({ bloodGroup: "AB_NEGATIVE" });

    await expect(updateDonorProfile("donor-1", { bloodGroup: "O_POSITIVE" }))
      .rejects.toMatchObject({ status: 400, message: expect.stringContaining("only be recorded once") });
    expect(updateMany).not.toHaveBeenCalled();
  });
});

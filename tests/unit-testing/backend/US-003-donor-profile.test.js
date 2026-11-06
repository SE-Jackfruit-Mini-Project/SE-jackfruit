import { jest } from "@jest/globals";

const findFirst = jest.fn();
const updateMany = jest.fn();

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
});

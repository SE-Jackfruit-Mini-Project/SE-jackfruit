/**
 * @file US-012-view-donation-history.test.js
 * @description Unit test suite for US-012: View Donation History.
 * Verifies that the service retrieves only accepted donation records belonging to the authenticated donor.
 */

import { jest } from "@jest/globals";

const findMany = jest.fn();

// Mock Prisma client singleton
jest.unstable_mockModule("../../../backend/src/utils/prisma.js", () => ({ prisma: { donation: { findMany } } }));
const { getDonationHistory } = await import("../../../backend/src/services/donation-history.service.js");

beforeEach(() => findMany.mockReset());

describe("US-012 donation history", () => {
  test("returns only accepted donations for the authenticated donor", async () => {
    findMany.mockResolvedValue([{ id: "donation-1", accepted: true }]);
    await expect(getDonationHistory("donor-1")).resolves.toHaveLength(1);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { donorId: "donor-1", accepted: true } }));
  });
});

import { jest } from "@jest/globals";

const findMany = jest.fn();

jest.unstable_mockModule("../../../backend/src/utils/prisma.js", () => ({
  prisma: {
    inventory: { findMany },
  },
}));

const {
  getAvailability,
} = await import("../../../backend/src/services/inventory.service.js");

beforeEach(() => {
  findMany.mockReset();
});

describe("US-006 view blood availability", () => {
  test("returns all eight blood groups", async () => {
    findMany.mockResolvedValue([]);

    const result = await getAvailability();

    expect(result).toHaveLength(8);
    expect(
      result.every(
        (row) =>
          row.availableUnits === 0 &&
          row.status === "OUT_OF_STOCK",
      ),
    ).toBe(true);
  });

  test("returns stored quantities for available groups", async () => {
    findMany.mockResolvedValue([
      {
        bloodGroup: "O_NEGATIVE",
        availableUnits: 12,
        status: "AVAILABLE",
      },
    ]);

    const result = await getAvailability();

    expect(result.find((row) => row.bloodGroup === "O_NEGATIVE"))
      .toEqual({
        bloodGroup: "O_NEGATIVE",
        availableUnits: 12,
        status: "AVAILABLE",
      });
  });

  test("does not modify inventory while reading", async () => {
    findMany.mockResolvedValue([]);

    await getAvailability();

    expect(findMany).toHaveBeenCalledTimes(1);
  });
});
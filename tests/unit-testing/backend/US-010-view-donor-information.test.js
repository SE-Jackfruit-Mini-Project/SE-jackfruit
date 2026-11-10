import { jest } from "@jest/globals";

const findMany = jest.fn();
const findFirst = jest.fn();

jest.unstable_mockModule("../../../backend/src/utils/prisma.js", () => ({
  prisma: { user: { findMany, findFirst } },
}));

const { listDonors, getDonorInformation } = await import("../../../backend/src/services/donor-information.service.js");

beforeEach(() => {
  findMany.mockReset();
  findFirst.mockReset();
});

describe("US-010 donor information", () => {
  test("lists donor accounts without password data", async () => {
    findMany.mockResolvedValue([{ id: "d1", fullName: "Demo Donor", email: "donor@example.com" }]);
    await expect(listDonors()).resolves.toHaveLength(1);
    const query = findMany.mock.calls[0][0];
    expect(query).toEqual(expect.objectContaining({
      where: { role: "DONOR" },
      orderBy: { fullName: "asc" },
    }));
    expect(query.select).not.toHaveProperty("passwordHash");
  });

  test("retrieves only a donor record by id", async () => {
    findFirst.mockResolvedValue({ id: "d1", fullName: "Demo Donor" });
    await expect(getDonorInformation("d1")).resolves.toMatchObject({ id: "d1" });
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "d1", role: "DONOR" } }));
  });
});

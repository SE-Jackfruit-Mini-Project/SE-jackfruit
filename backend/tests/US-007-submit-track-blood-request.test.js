import { jest } from "@jest/globals";

const create = jest.fn();
const findMany = jest.fn();

jest.unstable_mockModule("../src/utils/prisma.js", () => ({
  prisma: {
    bloodRequest: { create, findMany },
  },
}));

const {
  createBloodRequest,
  getRequesterRequests,
} = await import("../src/services/request.service.js");

beforeEach(() => {
  create.mockReset();
  findMany.mockReset();
});

describe("US-007 submit and track blood request", () => {
  test("creates a request with PENDING status", async () => {
    create.mockResolvedValue({
      id: "request-1",
      hospitalName: "City Hospital",
      bloodGroup: "A_POSITIVE",
      units: 2,
      urgency: "NORMAL",
      status: "PENDING",
      createdAt: new Date(),
    });

    const result = await createBloodRequest("requester-1", {
      hospitalName: "City Hospital",
      bloodGroup: "A_POSITIVE",
      units: 2,
      urgency: "NORMAL",
    });

    expect(result.status).toBe("PENDING");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        requesterId: "requester-1",
        status: "PENDING",
      }),
    }));
  });

  test("rejects invalid request quantity", async () => {
    await expect(
      createBloodRequest("requester-1", {
        hospitalName: "City Hospital",
        bloodGroup: "A_POSITIVE",
        units: 0,
      }),
    ).rejects.toMatchObject({ name: "ZodError" });

    expect(create).not.toHaveBeenCalled();
  });

  test("lists only the requester's records", async () => {
    findMany.mockResolvedValue([]);

    await getRequesterRequests("requester-1");

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { requesterId: "requester-1" },
    }));
  });
});

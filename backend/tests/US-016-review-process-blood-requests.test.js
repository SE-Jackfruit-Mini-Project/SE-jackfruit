import { jest } from "@jest/globals";

const findMany = jest.fn();
const findUnique = jest.fn();
const updateMany = jest.fn();

jest.unstable_mockModule("../src/utils/prisma.js", () => ({
  prisma: {
    bloodRequest: { findMany, findUnique, updateMany },
  },
}));

const {
  getAllRequests,
  reviewBloodRequest,
} = await import("../src/services/request.service.js");

beforeEach(() => {
  findMany.mockReset();
  findUnique.mockReset();
  updateMany.mockReset();
});

describe("US-016 review and process blood requests", () => {
  test("retrieves operational blood requests for staff review", async () => {
    findMany.mockResolvedValue([
      {
        id: "req-1",
        hospitalName: "Apollo Hospital",
        bloodGroup: "O_POSITIVE",
        units: 3,
        urgency: "URGENT",
        status: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date(),
        requester: { fullName: "Requester Apollo", email: "apollo@hospital.org" },
      },
    ]);

    const result = await getAllRequests();

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("PENDING");
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }],
      }),
    );
  });

  test("filters requests by status when filter is supplied", async () => {
    findMany.mockResolvedValue([]);

    await getAllRequests("PENDING");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PENDING" },
      }),
    );
  });

  test("approves a pending request and returns the updated record", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    findUnique.mockResolvedValue({
      id: "req-1",
      hospitalName: "Apollo Hospital",
      bloodGroup: "O_POSITIVE",
      units: 3,
      urgency: "URGENT",
      status: "APPROVED",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await reviewBloodRequest("req-1", "APPROVED");

    expect(result.status).toBe("APPROVED");
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "req-1", status: "PENDING" },
      data: { status: "APPROVED" },
    });
  });

  test("rejects a pending request and returns the updated record", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    findUnique.mockResolvedValue({
      id: "req-2",
      hospitalName: "City Clinic",
      bloodGroup: "A_NEGATIVE",
      units: 1,
      urgency: "NORMAL",
      status: "REJECTED",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await reviewBloodRequest("req-2", "REJECTED");

    expect(result.status).toBe("REJECTED");
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "req-2", status: "PENDING" },
      data: { status: "REJECTED" },
    });
  });

  test("prevents repeated processing of an already resolved request", async () => {
    // updateMany returns 0 matches because the status is no longer PENDING
    updateMany.mockResolvedValue({ count: 0 });
    findUnique.mockResolvedValue({
      id: "req-1",
      status: "APPROVED",
    });

    await expect(
      reviewBloodRequest("req-1", "REJECTED"),
    ).rejects.toMatchObject({
      code: "INVALID_STATUS_TRANSITION",
    });
  });

  test("rejects review when blood request does not exist", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    findUnique.mockResolvedValue(null);

    await expect(
      reviewBloodRequest("non-existent-id", "APPROVED"),
    ).rejects.toMatchObject({
      code: "REQUEST_NOT_FOUND",
    });
  });

  test("rejects invalid review decision status values", async () => {
    await expect(
      reviewBloodRequest("req-1", "INVALID_STATUS"),
    ).rejects.toMatchObject({
      name: "ZodError",
    });

    expect(updateMany).not.toHaveBeenCalled();
  });
});

import { jest } from "@jest/globals";

const findMany = jest.fn();
const findUnique = jest.fn();
const update = jest.fn();

jest.unstable_mockModule("../src/utils/prisma.js", () => ({
  prisma: {
    user: { findMany, findUnique, update },
  },
}));

const {
  getAllUsers,
  updateUserRole,
  updateUserStatus,
} = await import("../src/services/admin.service.js");

beforeEach(() => {
  findMany.mockReset();
  findUnique.mockReset();
  update.mockReset();
});

describe("US-017 manage users and access", () => {
  test("retrieves all registered system users with account details", async () => {
    findMany.mockResolvedValue([
      {
        id: "user-1",
        fullName: "Test Donor",
        email: "donor@example.com",
        role: "DONOR",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "admin-1",
        fullName: "System Admin",
        email: "admin@example.com",
        role: "ADMIN",
        isActive: true,
        createdAt: new Date(),
      },
    ]);

    const result = await getAllUsers();

    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("DONOR");
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      }),
    );
  });

  test("assigns and updates user role within permitted set", async () => {
    findUnique.mockResolvedValue({
      id: "user-1",
      email: "donor@example.com",
      role: "DONOR",
    });

    update.mockResolvedValue({
      id: "user-1",
      fullName: "Test Donor",
      email: "donor@example.com",
      role: "STAFF",
      isActive: true,
      createdAt: new Date(),
    });

    const result = await updateUserRole("admin-1", "user-1", "STAFF");

    expect(result.role).toBe("STAFF");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { role: "STAFF" },
      }),
    );
  });

  test("rejects invalid role selection", async () => {
    await expect(
      updateUserRole("admin-1", "user-1", "SUPER_ADMIN"),
    ).rejects.toMatchObject({
      name: "ZodError",
    });

    expect(update).not.toHaveBeenCalled();
  });

  test("prevents an administrator from modifying their own role", async () => {
    await expect(
      updateUserRole("admin-1", "admin-1", "DONOR"),
    ).rejects.toMatchObject({
      code: "CANNOT_CHANGE_OWN_ROLE",
    });

    expect(update).not.toHaveBeenCalled();
  });

  test("deactivates and activates a user account successfully", async () => {
    findUnique.mockResolvedValue({
      id: "user-2",
      email: "user2@example.com",
      isActive: true,
    });

    update.mockResolvedValue({
      id: "user-2",
      fullName: "User Two",
      email: "user2@example.com",
      role: "DONOR",
      isActive: false,
      createdAt: new Date(),
    });

    const result = await updateUserStatus("admin-1", "user-2", false);

    expect(result.isActive).toBe(false);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-2" },
        data: { isActive: false },
      }),
    );
  });

  test("prevents an administrator from deactivating their own account", async () => {
    await expect(
      updateUserStatus("admin-1", "admin-1", false),
    ).rejects.toMatchObject({
      code: "CANNOT_DEACTIVATE_SELF",
    });

    expect(update).not.toHaveBeenCalled();
  });

  test("rejects updates when target user does not exist", async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      updateUserRole("admin-1", "non-existent-user", "STAFF"),
    ).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
    });
  });

  test("rejects non-boolean account status input", async () => {
    await expect(
      updateUserStatus("admin-1", "user-1", "invalid_status"),
    ).rejects.toMatchObject({
      name: "ZodError",
    });
  });
});

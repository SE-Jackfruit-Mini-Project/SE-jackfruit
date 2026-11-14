/**
 * @file US-002-login-role-based-access.test.js
 * @description Unit test suite for US-002: Login and Role-Based Access Control.
 * Tests password hash verification via bcrypt, case-insensitive email comparison,
 * rejection of incorrect credentials, and input validation on login credentials.
 */

import { jest } from "@jest/globals";

const findUnique = jest.fn();
const passwordHash = "$2a$10$9w55YveqyNjd5PBubW1/E.dnm6j0rdzN3jEH.g0aZ/rzypZVuouQG"; // "password123"

// Mock Prisma client singleton
jest.unstable_mockModule("../../../backend/src/utils/prisma.js", () => ({
  prisma: { user: { findUnique } },
}));

const { loginUser } = await import("../../../backend/src/services/auth.service.js");

const { syncSessionUser } = await import("../../../backend/src/middleware/session-user.middleware.js");

beforeEach(() => findUnique.mockReset());

function sessionContext() {
  const req = {
    session: {
      user: { id: "user-1", role: "ADMIN", fullName: "Old name" },
      destroy: jest.fn((callback) => callback()),
    },
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    clearCookie: jest.fn(),
  };
  return { req, res, next: jest.fn() };
}

describe("US-002 login and role-based access", () => {
  test("logs in with valid credentials and returns the stored role", async () => {
    findUnique.mockResolvedValue({
      id: "user-1",
      fullName: "Staff User",
      email: "staff@example.com",
      role: "STAFF",
      passwordHash,
      createdAt: new Date(),
    });

    await expect(
      loginUser({ email: "STAFF@EXAMPLE.COM", password: "password123" }),
    ).resolves.toMatchObject({
      email: "staff@example.com",
      role: "STAFF",
    });
  });

  test("rejects invalid credentials", async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      loginUser({ email: "unknown@example.com", password: "wrongpass" }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  test("rejects malformed login input", async () => {
    await expect(
      loginUser({ email: "not-an-email", password: "" }),
    ).rejects.toMatchObject({ name: "ZodError" });
  });

  test("refreshes role and profile before authorization", async () => {
    const { req, res, next } = sessionContext();
    findUnique.mockResolvedValue({ id: "user-1", role: "DONOR", fullName: "New name", isActive: true });

    await syncSessionUser(req, res, next);

    expect(req.session.user).toMatchObject({ role: "DONOR", fullName: "New name" });
    expect(next).toHaveBeenCalledWith();
  });

  test.each([null, { id: "user-1", isActive: false }])("rejects deleted or deactivated accounts", async (user) => {
    const { req, res, next } = sessionContext();
    findUnique.mockResolvedValue(user);

    await syncSessionUser(req, res, next);

    expect(req.session.destroy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("database failure cannot authorize a stale session", async () => {
    const { req, res, next } = sessionContext();
    const error = new Error("Database unavailable");
    findUnique.mockRejectedValue(error);

    await syncSessionUser(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  test("public requests do not query the database", async () => {
    const { req, res, next } = sessionContext();
    req.session = {};

    await syncSessionUser(req, res, next);

    expect(findUnique).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });
});

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

beforeEach(() => findUnique.mockReset());

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
});

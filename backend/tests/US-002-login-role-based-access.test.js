import { jest } from "@jest/globals";
import bcrypt from "bcryptjs";

const findUnique = jest.fn();

jest.unstable_mockModule("../src/utils/prisma.js", () => ({
  prisma: { user: { findUnique } },
}));

const { loginUser } = await import("../src/services/auth.service.js");

beforeEach(() => findUnique.mockReset());

describe("US-002 login and role-based access", () => {
  test("logs in with valid credentials and returns the stored role", async () => {
    const passwordHash = await bcrypt.hash("password123", 4);

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

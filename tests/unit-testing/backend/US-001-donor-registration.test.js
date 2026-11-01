import { jest } from "@jest/globals";

const create = jest.fn();

jest.unstable_mockModule("../../../backend/src/utils/prisma.js", () => ({
  prisma: { user: { create } },
}));

const { registerDonor } = await import("../../../backend/src/services/registration.service.js");

beforeEach(() => create.mockReset());

describe("US-001 donor registration", () => {
  test("stores a valid registration as a donor with a hashed password", async () => {
    create.mockImplementation(async ({ data, select }) => ({
      id: "u-1",
      fullName: data.fullName,
      email: data.email,
      role: data.role,
      createdAt: new Date("2026-01-01"),
      passwordHash: data.passwordHash,
      select,
    }));

    const result = await registerDonor({
      fullName: "Test Donor",
      email: "DONOR@EXAMPLE.COM",
      password: "donor-password",
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        fullName: "Test Donor",
        email: "donor@example.com",
        role: "DONOR",
      }),
    }));
    const hash = create.mock.calls[0][0].data.passwordHash;
    expect(hash).not.toBe("donor-password");
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(result.role).toBe("DONOR");
  });

  test("rejects invalid registration input", async () => {
    await expect(registerDonor({ fullName: "", email: "bad", password: "short" }))
      .rejects.toMatchObject({ name: "ZodError" });
    expect(create).not.toHaveBeenCalled();
  });

  test("preserves duplicate-email failures for the route to report", async () => {
    const duplicate = Object.assign(new Error("duplicate"), { code: "P2002" });
    create.mockRejectedValue(duplicate);
    await expect(registerDonor({ fullName: "Test Donor", email: "one@example.com", password: "password123" }))
      .rejects.toMatchObject({ code: "P2002" });
  });
});

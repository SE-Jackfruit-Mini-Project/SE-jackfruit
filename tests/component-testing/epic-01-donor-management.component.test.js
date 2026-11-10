import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

const registerDonor = jest.fn();
const loginUser = jest.fn();
const getDonorProfile = jest.fn();
const updateDonorProfile = jest.fn();
const getDonationHistory = jest.fn();
const listDonors = jest.fn();
const getDonorInformation = jest.fn();

jest.unstable_mockModule("../../backend/src/services/registration.service.js", () => ({ registerDonor }));
jest.unstable_mockModule("../../backend/src/services/auth.service.js", () => ({ loginUser }));
jest.unstable_mockModule("../../backend/src/services/donor-profile.service.js", () => ({ getDonorProfile, updateDonorProfile }));
jest.unstable_mockModule("../../backend/src/services/donation-history.service.js", () => ({ getDonationHistory }));
jest.unstable_mockModule("../../backend/src/services/donor-information.service.js", () => ({ listDonors, getDonorInformation }));

const { authRouter } = await import("../../backend/src/routes/auth.routes.js");
const { donorProfileRouter } = await import("../../backend/src/routes/donor-profile.routes.js");
const { donationHistoryRouter } = await import("../../backend/src/routes/donation-history.routes.js");
const { donorInformationRouter } = await import("../../backend/src/routes/donor-information.routes.js");

function createApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (user) req.session = { user };
    next();
  });
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/donors", donorProfileRouter);
  app.use("/api/v1/donation-history", donationHistoryRouter);
  app.use("/api/v1/donor-information", donorInformationRouter);
  return app;
}

beforeEach(() => jest.clearAllMocks());

describe("EPIC-01 Donor Management component", () => {
  test("registers a donor through the public registration endpoint", async () => {
    const donor = { id: "donor-1", fullName: "Tusti", role: "DONOR" };
    registerDonor.mockResolvedValue(donor);

    const response = await request(createApp(null)).post("/api/v1/auth/register").send({ fullName: "Tusti" });

    expect(response.status).toBe(201);
    expect(response.body.user).toEqual(donor);
    expect(registerDonor).toHaveBeenCalledWith({ fullName: "Tusti" });
  });

  test("returns and updates only the authenticated donor's profile", async () => {
    const profile = { id: "donor-1", fullName: "Tusti", bloodGroup: "B_POSITIVE" };
    getDonorProfile.mockResolvedValue(profile);
    updateDonorProfile.mockResolvedValue({ ...profile, fullName: "Tusti S" });

    const app = createApp({ id: "donor-1", role: "DONOR" });
    const read = await request(app).get("/api/v1/donors/me");
    const update = await request(app).put("/api/v1/donors/me").send({ fullName: "Tusti S" });

    expect(read.status).toBe(200);
    expect(read.body.user).toEqual(profile);
    expect(update.status).toBe(200);
    expect(update.body.user.fullName).toBe("Tusti S");
    expect(getDonorProfile).toHaveBeenCalledWith("donor-1");
    expect(updateDonorProfile).toHaveBeenCalledWith("donor-1", { fullName: "Tusti S" });
  });

  test("allows a donor to see only their own donation-history component", async () => {
    getDonationHistory.mockResolvedValue([{ id: "donation-1", units: 1 }]);

    const response = await request(createApp({ id: "donor-1", role: "DONOR" })).get("/api/v1/donation-history");

    expect(response.status).toBe(200);
    expect(response.body.donations).toEqual([{ id: "donation-1", units: 1 }]);
    expect(getDonationHistory).toHaveBeenCalledWith("donor-1");
  });

  test("allows staff to find and inspect donor records, while blocking a donor", async () => {
    listDonors.mockResolvedValue([{ id: "donor-1", fullName: "Tusti" }]);
    getDonorInformation.mockResolvedValue({ id: "donor-1", fullName: "Tusti", gender: "FEMALE" });

    const staffApp = createApp({ id: "staff-1", role: "STAFF" });
    const list = await request(staffApp).get("/api/v1/donor-information");
    const detail = await request(staffApp).get("/api/v1/donor-information/donor-1");
    const denied = await request(createApp({ id: "donor-1", role: "DONOR" })).get("/api/v1/donor-information");

    expect(list.status).toBe(200);
    expect(list.body.donors).toHaveLength(1);
    expect(detail.status).toBe(200);
    expect(detail.body.donor.gender).toBe("FEMALE");
    expect(denied.status).toBe(403);
  });
});

import { jest } from "@jest/globals";
import request from "supertest";

// Keep the production application and its real routers, middleware, and services.
// Replace only PostgreSQL session storage and Prisma persistence with isolated in-memory adapters.
jest.unstable_mockModule("express-session", () => ({
  default: () => (req, _res, next) => {
    const id = req.get("x-test-user-id");
    const role = req.get("x-test-role");
    req.session = {
      ...(id && role ? { user: { id, role } } : {}),
      destroy: (callback) => callback(null),
    };
    next();
  },
}));
jest.unstable_mockModule("connect-pg-simple", () => ({
  default: () => class TestSessionStore {},
}));

let users;
let slots;
let appointments;
let donations;
let inventory;
let movements;
let bloodRequests;
let nextId;

const selected = (record, selection) => {
  if (!selection) return record ? { ...record } : null;
  return Object.fromEntries(Object.entries(selection).filter(([, include]) => include).map(([key]) => [key, record?.[key]]));
};

const cloneMap = (map) => new Map([...map].map(([key, value]) => [key, structuredClone(value)]));

const prisma = {
  user: {
    create: async ({ data, select }) => {
      const record = { id: `user-${++nextId}`, createdAt: new Date(), isActive: true, ...data };
      users.set(record.id, record);
      return selected(record, select);
    },
    findUnique: async ({ where, select }) => {
      const record = where.id ? users.get(where.id) : [...users.values()].find((user) => user.email === where.email);
      return selected(record, select);
    },
    findFirst: async ({ where, select }) => {
      let record = [...users.values()].find((user) =>
        (!where.id || user.id === where.id)
        && (!where.role || user.role === where.role)
        && (!where.bloodGroup || (where.bloodGroup.not === null ? user.bloodGroup !== null : user.bloodGroup === where.bloodGroup))
      );
      if (where.appointments?.some && record) {
        if (![...appointments.values()].some((appointment) => appointment.donorId === record.id)) record = null;
      }
      return selected(record, select);
    },
  },
  appointmentSlot: {
    findMany: async ({ where }) => [...slots.values()].filter((slot) => {
      if (!where) return true;
      if (typeof where.date === "string") return slot.date === where.date;
      if (where.date?.gte) return slot.date >= where.date.gte && (!where.isAvailable || slot.isAvailable === where.isAvailable);
      return true;
    }),
    findUnique: async ({ where }) => slots.get(where.id) ?? null,
    create: async ({ data }) => {
      const record = { id: `slot-${++nextId}`, ...data };
      slots.set(record.id, record);
      return { ...record };
    },
    update: async ({ where, data }) => {
      const record = slots.get(where.id);
      Object.assign(record, data);
      return { ...record };
    },
  },
  appointment: {
    findFirst: async ({ where }) => [...appointments.values()].find((item) =>
      item.donorId === where.donorId && item.slotId === where.slotId && (!where.status || item.status === where.status)
    ) ?? null,
    create: async ({ data, include }) => {
      const record = { id: `appointment-${++nextId}`, createdAt: new Date(), ...data };
      appointments.set(record.id, record);
      return include?.slot ? { ...record, slot: { ...slots.get(record.slotId) } } : { ...record };
    },
    findMany: async ({ where }) => [...appointments.values()].filter((item) => item.donorId === where.donorId),
  },
  donation: {
    findFirst: async ({ where }) => [...donations.values()]
      .filter((item) => item.donorId === where.donorId && (!where.accepted || item.accepted === where.accepted))
      .sort((a, b) => b.donationDate - a.donationDate)[0] ?? null,
    create: async ({ data, include }) => {
      const record = { id: `donation-${++nextId}`, createdAt: new Date(), ...data };
      donations.set(record.id, record);
      return include ? {
        ...record,
        donor: selected(users.get(record.donorId), include.donor.select),
        recordedBy: selected(users.get(record.recordedById), include.recordedBy.select),
      } : { ...record };
    },
  },
  inventory: {
    upsert: async ({ where, create, update }) => {
      let record = [...inventory.values()].find((item) => item.bloodGroup === where.bloodGroup);
      if (!record) {
        record = { id: `inventory-${++nextId}`, ...create };
        inventory.set(record.id, record);
      } else if (update?.availableUnits?.increment) {
        record.availableUnits += update.availableUnits.increment;
      }
      return { ...record };
    },
    findMany: async () => [...inventory.values()].map(({ bloodGroup, availableUnits, status }) => ({ bloodGroup, availableUnits, status })),
    findUnique: async ({ where }) => [...inventory.values()].find((item) => item.bloodGroup === where.bloodGroup) ?? null,
    update: async ({ where, data }) => {
      const record = [...inventory.values()].find((item) => item.id === where.id);
      Object.assign(record, data);
      return { ...record };
    },
    updateMany: async ({ where, data }) => {
      const record = [...inventory.values()].find((item) => item.bloodGroup === where.bloodGroup);
      if (!record || (where.availableUnits?.gte !== undefined && record.availableUnits < where.availableUnits.gte)) return { count: 0 };
      record.availableUnits -= data.availableUnits.decrement;
      return { count: 1 };
    },
  },
  inventoryMovement: {
    create: async ({ data }) => {
      const record = { id: `movement-${++nextId}`, ...data };
      movements.push(record);
      return record;
    },
  },
  bloodRequest: {
    create: async ({ data, select }) => {
      const now = new Date();
      const record = { id: `request-${++nextId}`, createdAt: now, updatedAt: now, ...data };
      bloodRequests.set(record.id, record);
      return selected(record, select);
    },
    findUnique: async ({ where, select }) => selected(bloodRequests.get(where.id), select),
    findMany: async ({ where = {} }) => [...bloodRequests.values()].filter((item) =>
      (!where.status || item.status === where.status) && (!where.requesterId || item.requesterId === where.requesterId)
    ).sort((a, b) => a.createdAt - b.createdAt),
    updateMany: async ({ where, data }) => {
      const record = bloodRequests.get(where.id);
      if (!record || (where.status && record.status !== where.status)) return { count: 0 };
      Object.assign(record, data, { updatedAt: new Date() });
      return { count: 1 };
    },
  },
  $transaction: async (callback) => {
    const snapshot = {
      users: cloneMap(users), slots: cloneMap(slots), appointments: cloneMap(appointments),
      donations: cloneMap(donations), inventory: cloneMap(inventory), bloodRequests: cloneMap(bloodRequests),
      movements: structuredClone(movements),
    };
    try {
      return await callback(prisma);
    } catch (error) {
      users = snapshot.users;
      slots = snapshot.slots;
      appointments = snapshot.appointments;
      donations = snapshot.donations;
      inventory = snapshot.inventory;
      bloodRequests = snapshot.bloodRequests;
      movements = snapshot.movements;
      throw error;
    }
  },
};

jest.unstable_mockModule("../../../backend/src/utils/prisma.js", () => ({ prisma }));

const { app } = await import("../../../backend/src/app.js");

const as = (role, id) => ({ "x-test-role": role, "x-test-user-id": id });

beforeEach(() => {
  users = new Map();
  slots = new Map();
  appointments = new Map();
  donations = new Map();
  inventory = new Map();
  movements = [];
  bloodRequests = new Map();
  nextId = 0;
});

describe("full system integration workflow", () => {
  test("donor registration and appointment, donation, inventory, request, and allocation stay connected", async () => {
    const registration = await request(app).post("/api/v1/auth/register").send({
      fullName: "Tusti Donor",
      email: "tusti@example.test",
      password: "test-password-123",
      dateOfBirth: "1990-01-01",
      gender: "FEMALE",
      bloodGroup: "B_POSITIVE",
    });
    expect(registration.status).toBe(201);
    const donorId = registration.body.user.id;

    const profile = await request(app).get("/api/v1/donors/me").set(as("DONOR", donorId));
    expect(profile.status).toBe(200);
    expect(profile.body.user.bloodGroup).toBe("B_POSITIVE");

    const slotDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const slotResponse = await request(app).post("/api/v1/appointment-slots").set(as("STAFF", "staff-1")).send({
      date: slotDate, startTime: "09:00", endTime: "10:00", maxCapacity: 5,
    });
    expect(slotResponse.status).toBe(201);

    const booking = await request(app).post("/api/v1/appointments").set(as("DONOR", donorId)).send({
      slotId: slotResponse.body.slot.id, weightKg: 55,
    });
    expect(booking.status).toBe(201);
    expect(booking.body.appointment.status).toBe("SCHEDULED");

    const donation = await request(app).post("/api/v1/donations").set(as("STAFF", "staff-1")).send({
      donorId, units: 1, donationDate: new Date().toISOString().slice(0, 10), accepted: true,
    });
    expect(donation.status).toBe(201);
    expect(donation.body.donation.bloodGroup).toBe("B_POSITIVE");

    const requesterHeaders = as("HOSPITAL_REQUESTER", "hospital-1");
    const bloodRequest = await request(app).post("/api/v1/requests").set(requesterHeaders).send({
      hospitalName: "City Hospital", bloodGroup: "B_POSITIVE", units: 1,
    });
    expect(bloodRequest.status).toBe(201);
    expect(bloodRequest.body.request.status).toBe("PENDING");

    const review = await request(app).patch(`/api/v1/requests/${bloodRequest.body.request.id}/review`)
      .set(as("STAFF", "staff-1")).send({ status: "APPROVED" });
    expect(review.status).toBe(200);
    expect(review.body.request.status).toBe("APPROVED");

    const allocated = await request(app).post(`/api/v1/allocations/${bloodRequest.body.request.id}`)
      .set(as("STAFF", "staff-1"));
    expect(allocated.status).toBe(200);
    expect(allocated.body.allocation.status).toBe("ALLOCATED");

    const availability = await request(app).get("/api/v1/inventory/availability").set(requesterHeaders);
    const bPositive = availability.body.availability.find((item) => item.bloodGroup === "B_POSITIVE");
    expect(bPositive).toMatchObject({ availableUnits: 0, status: "OUT_OF_STOCK" });
    expect(movements.map((item) => item.type)).toEqual(["DONATION", "ALLOCATION"]);
  });

  test("failed allocation rolls back request status and inventory together", async () => {
    const inventoryRow = { id: "inventory-1", bloodGroup: "A_POSITIVE", availableUnits: 1, status: "LOW" };
    inventory.set(inventoryRow.id, inventoryRow);
    bloodRequests.set("request-shortage", {
      id: "request-shortage", hospitalName: "City Hospital", bloodGroup: "A_POSITIVE",
      units: 2, status: "APPROVED", createdAt: new Date(), updatedAt: new Date(),
    });

    const response = await request(app).post("/api/v1/allocations/request-shortage").set(as("STAFF", "staff-1"));

    expect(response.status).toBe(409);
    expect(bloodRequests.get("request-shortage").status).toBe("APPROVED");
    expect(inventory.get("inventory-1").availableUnits).toBe(1);
    expect(movements).toHaveLength(0);
  });
});

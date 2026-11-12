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
let operationApprovals;
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
    findUnique: async ({ where, include }) => {
      const slot = slots.get(where.id);
      return slot && include?._count
        ? { ...slot, _count: { appointments: [...appointments.values()].filter((item) => item.slotId === slot.id).length } }
        : slot ?? null;
    },
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
    delete: async ({ where }) => {
      const record = slots.get(where.id);
      slots.delete(where.id);
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
  operationApproval: {
    create: async ({ data }) => {
      const record = { id: `approval-${++nextId}`, status: "PENDING", createdAt: new Date(), reviewedAt: null, ...data };
      operationApprovals.set(record.id, record);
      return { ...record, requester: users.get(record.requesterId) ?? null };
    },
    findUnique: async ({ where }) => {
      const record = operationApprovals.get(where.id);
      return record ? {
        ...record,
        requester: users.get(record.requesterId) ?? null,
        reviewer: record.reviewerId ? users.get(record.reviewerId) ?? null : null,
      } : null;
    },
    findMany: async ({ where = {} }) => [...operationApprovals.values()]
      .filter((item) => (!where.status || item.status === where.status)
        && (!where.requesterId || item.requesterId === where.requesterId))
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((item) => ({
        ...item,
        requester: users.get(item.requesterId) ?? null,
        reviewer: item.reviewerId ? users.get(item.reviewerId) ?? null : null,
      })),
    updateMany: async ({ where, data }) => {
      const record = operationApprovals.get(where.id);
      if (!record || (where.status && record.status !== where.status)) return { count: 0 };
      Object.assign(record, data);
      return { count: 1 };
    },
  },
  $transaction: async (callback) => {
    const snapshot = {
      users: cloneMap(users), slots: cloneMap(slots), appointments: cloneMap(appointments),
      donations: cloneMap(donations), inventory: cloneMap(inventory), bloodRequests: cloneMap(bloodRequests),
      operationApprovals: cloneMap(operationApprovals),
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
      operationApprovals = snapshot.operationApprovals;
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
  operationApprovals = new Map();
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
    const proposedSlot = await request(app).post("/api/v1/appointment-slots").set(as("STAFF", "staff-1")).send({
      date: slotDate, startTime: "09:00", endTime: "10:00", maxCapacity: 5,
    });
    expect(proposedSlot.status).toBe(202);
    expect(slots.size).toBe(0);
    const approvedSlot = await request(app).post(`/api/v1/operation-approvals/${proposedSlot.body.approval.id}/review`)
      .set(as("ADMIN", "admin-1")).send({ decision: "APPROVE" });
    expect(approvedSlot.status).toBe(200);
    expect(slots.size).toBe(1);
    const duplicateSlotApproval = await request(app).post(`/api/v1/operation-approvals/${proposedSlot.body.approval.id}/review`)
      .set(as("ADMIN", "admin-1")).send({ decision: "APPROVE" });
    expect(duplicateSlotApproval.status).toBe(409);
    expect(slots.size).toBe(1);
    const slotId = [...slots.keys()][0];

    const booking = await request(app).post("/api/v1/appointments").set(as("DONOR", donorId)).send({
      slotId, weightKg: 55,
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

  test("staff inventory additions and adjustments only affect stock after admin approval", async () => {
    const addition = await request(app).post("/api/v1/inventory/stock").set(as("STAFF", "staff-1")).send({
      bloodGroup: "A_POSITIVE", units: 8, type: "PURCHASE", reason: "Regional delivery",
    });
    expect(addition.status).toBe(202);
    expect(inventory.size).toBe(0);

    const additionApproval = await request(app).post(`/api/v1/operation-approvals/${addition.body.approval.id}/review`)
      .set(as("ADMIN", "admin-1")).send({ decision: "APPROVE" });
    expect(additionApproval.status).toBe(200);
    const inventoryRow = [...inventory.values()][0];
    expect(inventoryRow.availableUnits).toBe(8);
    expect(movements).toHaveLength(1);

    const adjustment = await request(app).patch("/api/v1/inventory/A_POSITIVE").set(as("STAFF", "staff-1")).send({
      delta: -3, reason: "Expired units",
    });
    expect(adjustment.status).toBe(202);
    expect(inventoryRow.availableUnits).toBe(8);

    const adjustmentApproval = await request(app).post(`/api/v1/operation-approvals/${adjustment.body.approval.id}/review`)
      .set(as("ADMIN", "admin-1")).send({ decision: "APPROVE" });
    expect(adjustmentApproval.status).toBe(200);
    expect(inventoryRow.availableUnits).toBe(5);
    expect(movements.map((movement) => movement.delta)).toEqual([8, -3]);

    const rejectedAddition = await request(app).post("/api/v1/inventory/stock").set(as("STAFF", "staff-1")).send({
      bloodGroup: "A_POSITIVE", units: 4, type: "TRANSFER_IN",
    });
    expect(rejectedAddition.status).toBe(202);
    const rejection = await request(app).post(`/api/v1/operation-approvals/${rejectedAddition.body.approval.id}/review`)
      .set(as("ADMIN", "admin-1")).send({ decision: "REJECT", decisionNote: "Delivery not verified" });
    expect(rejection.status).toBe(200);
    expect(inventoryRow.availableUnits).toBe(5);
    expect(movements).toHaveLength(2);
  });

  test("admin can reject a slot deletion proposal and slots with appointments cannot be deleted", async () => {
    const occupied = await request(app).post("/api/v1/appointment-slots").set(as("ADMIN", "admin-1")).send({
      date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      startTime: "12:00", endTime: "13:00", maxCapacity: 2,
    });
    expect(occupied.status).toBe(201);
    const bookedSlotId = occupied.body.slot.id;
    appointments.set("appointment-existing", { id: "appointment-existing", slotId: bookedSlotId, status: "SCHEDULED" });

    const blockedProposal = await request(app).delete(`/api/v1/appointment-slots/${bookedSlotId}`).set(as("STAFF", "staff-1"));
    expect(blockedProposal.status).toBe(409);
    expect(slots.has(bookedSlotId)).toBe(true);

    const empty = await request(app).post("/api/v1/appointment-slots").set(as("ADMIN", "admin-1")).send({
      date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      startTime: "14:00", endTime: "15:00", maxCapacity: 2,
    });
    const deletion = await request(app).delete(`/api/v1/appointment-slots/${empty.body.slot.id}`).set(as("STAFF", "staff-1"));
    expect(deletion.status).toBe(202);
    expect(slots.has(empty.body.slot.id)).toBe(true);
    const rejected = await request(app).post(`/api/v1/operation-approvals/${deletion.body.approval.id}/review`)
      .set(as("ADMIN", "admin-1")).send({ decision: "REJECT" });
    expect(rejected.status).toBe(200);
    expect(slots.has(empty.body.slot.id)).toBe(true);

    const deletable = await request(app).post("/api/v1/appointment-slots").set(as("ADMIN", "admin-1")).send({
      date: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
      startTime: "18:00", endTime: "19:00", maxCapacity: 2,
    });
    const approvedDeletion = await request(app).delete(`/api/v1/appointment-slots/${deletable.body.slot.id}`).set(as("STAFF", "staff-1"));
    expect(approvedDeletion.status).toBe(202);
    const deletionDecision = await request(app).post(`/api/v1/operation-approvals/${approvedDeletion.body.approval.id}/review`)
      .set(as("ADMIN", "admin-1")).send({ decision: "APPROVE" });
    expect(deletionDecision.status).toBe(200);
    expect(slots.has(deletable.body.slot.id)).toBe(false);
  });

  test("staff cannot review proposals and non-operational roles cannot submit them", async () => {
    const proposal = await request(app).post("/api/v1/appointment-slots").set(as("STAFF", "staff-1")).send({
      date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      startTime: "16:00", endTime: "17:00", maxCapacity: 2,
    });
    expect(proposal.status).toBe(202);
    const staffReview = await request(app).post(`/api/v1/operation-approvals/${proposal.body.approval.id}/review`)
      .set(as("STAFF", "staff-2")).send({ decision: "APPROVE" });
    expect(staffReview.status).toBe(403);
    expect(operationApprovals.get(proposal.body.approval.id).status).toBe("PENDING");
    const rejection = await request(app).post(`/api/v1/operation-approvals/${proposal.body.approval.id}/review`)
      .set(as("ADMIN", "admin-1")).send({ decision: "REJECT" });
    expect(rejection.status).toBe(200);
    expect(slots.size).toBe(0);

    for (const role of ["DONOR", "HOSPITAL_REQUESTER"]) {
      const response = await request(app).post("/api/v1/operation-approvals").set(as(role, `${role}-1`)).send({
        action: "ADD_STOCK", payload: { bloodGroup: "A_POSITIVE", units: 1, type: "PURCHASE" },
      });
      expect(response.status).toBe(403);
      expect((await request(app).get("/api/v1/operation-approvals").set(as(role, `${role}-1`))).status).toBe(403);
    }
    const staffProposals = await request(app).get("/api/v1/operation-approvals").set(as("STAFF", "staff-1"));
    expect(staffProposals.status).toBe(200);
    expect(staffProposals.body.approvals).toHaveLength(1);
    expect(staffProposals.body.approvals[0].requesterId).toBe("staff-1");
    const otherStaffProposals = await request(app).get("/api/v1/operation-approvals").set(as("STAFF", "staff-2"));
    expect(otherStaffProposals.status).toBe(200);
    expect(otherStaffProposals.body.approvals).toHaveLength(0);
  });
});

import { z } from "zod";
import { prisma } from "../utils/prisma.js";

const querySchema = z.object({
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
const statusSchema = z.object({ status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]) });
const idSchema = z.string().trim().min(1);
function fail(message, status) { const error = new Error(message); error.status = status; throw error; }

// FR-018: staff operational view; never expose donor credentials.
export async function listStaffAppointments(query = {}) {
  const { status, page, limit } = querySchema.parse(query);
  const rows = await prisma.appointment.findMany({
    where: status ? { status } : {},
    select: {
      id: true, status: true, weightKg: true, notes: true,
      donor: { select: { id: true, fullName: true, email: true, bloodGroup: true } },
      slot: { select: { date: true, startTime: true, endTime: true } },
    },
    orderBy: [{ slot: { date: "desc" } }, { slot: { startTime: "asc" } }, { id: "asc" }],
    skip: (page - 1) * limit, take: limit + 1,
  });
  return { appointments: rows.slice(0, limit), hasMore: rows.length > limit };
}

export async function updateStaffAppointmentStatus(appointmentId, input) {
  const id = idSchema.parse(appointmentId);
  const { status } = statusSchema.parse(input);
  if (status !== "CANCELLED") {
    fail("Scheduled appointments may be cancelled here. Record a donation to complete an appointment; cancelled appointments must be booked again.", 409);
  }
  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUnique({ where: { id } });
    if (!appointment) fail("Appointment not found.", 404);
    if (appointment.status !== "SCHEDULED") fail("Only scheduled appointments can be cancelled.", 409);
    const claimed = await tx.appointment.updateMany({
      where: { id, status: "SCHEDULED", slotId: appointment.slotId },
      data: { status: "CANCELLED" },
    });
    if (claimed.count !== 1) fail("The appointment has changed. Refresh and retry.", 409);
    const released = await tx.appointmentSlot.updateMany({
      where: { id: appointment.slotId, bookedCount: { gt: 0 } },
      data: { bookedCount: { decrement: 1 }, isAvailable: true },
    });
    if (released.count !== 1) fail("Slot capacity could not be released. No changes were saved.", 409);
    return tx.appointment.findUnique({ where: { id }, select: { id: true, status: true, slotId: true } });
  });
}

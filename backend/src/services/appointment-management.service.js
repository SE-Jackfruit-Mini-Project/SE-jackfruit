
import { z } from "zod";
import { prisma } from "../utils/prisma.js";

const rescheduleSchema = z.object({
  slotId: z.string().trim().min(1, "Select an appointment slot."),
});

function makeError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function isFutureSlot(slot) {
  if (!slot) return false;
  return new Date(`${slot.date}T${slot.startTime}:00.000Z`) > new Date();
}

export async function getDonorAppointments(donorId) {
  return prisma.appointment.findMany({
    where: { donorId },
    include: { slot: true },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function rescheduleDonorAppointment(
  donorId,
  appointmentId,
  input
) {
  const values = rescheduleSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findFirst({
      where: { id: appointmentId, donorId },
      include: { slot: true },
    });

    if (!appointment) {
      throw makeError("Appointment not found.", 404);
    }

    if (appointment.status !== "SCHEDULED") {
      throw makeError("Only scheduled appointments can be rescheduled.", 400);
    }

    if (!isFutureSlot(appointment.slot)) {
      throw makeError("This appointment can no longer be rescheduled.", 400);
    }

    if (appointment.slotId === values.slotId) {
      throw makeError("Choose a different appointment slot.", 400);
    }

    const newSlot = await tx.appointmentSlot.findUnique({
      where: { id: values.slotId },
    });

    if (!newSlot) {
      throw makeError("The selected slot was not found.", 404);
    }

    if (
      !isFutureSlot(newSlot) ||
      !newSlot.isAvailable ||
      newSlot.bookedCount >= newSlot.maxCapacity
    ) {
      throw makeError("The selected slot is no longer available.", 409);
    }

    // The schema has a unique donorId + slotId constraint.
    const duplicate = await tx.appointment.findFirst({
      where: {
        donorId,
        slotId: newSlot.id,
        id: { not: appointmentId },
      },
    });

    if (duplicate) {
      throw makeError("You already have an appointment record for that slot.", 409);
    }

    // Reserve capacity conditionally so concurrent requests cannot overbook.
    const reserved = await tx.appointmentSlot.updateMany({
      where: {
        id: newSlot.id,
        date: { gte: new Date().toISOString().slice(0, 10) },
        isAvailable: true,
        bookedCount: { lt: newSlot.maxCapacity },
      },
      data: { bookedCount: { increment: 1 } },
    });

    if (reserved.count !== 1) {
      throw makeError("The selected slot has just become unavailable.", 409);
    }

    const released = await tx.appointmentSlot.updateMany({
      where: {
        id: appointment.slotId,
        bookedCount: { gt: 0 },
      },
      data: {
        bookedCount: { decrement: 1 },
        isAvailable: true,
      },
    });

    if (released.count !== 1) {
      throw makeError(
        "The original slot could not be released. No changes were saved.",
        409
      );
    }

    return tx.appointment.update({
      where: { id: appointmentId },
      data: { slotId: newSlot.id },
      include: { slot: true },
    });
  });
}

export async function cancelDonorAppointment(donorId, appointmentId) {
  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findFirst({
      where: { id: appointmentId, donorId },
      include: { slot: true },
    });

    if (!appointment) {
      throw makeError("Appointment not found.", 404);
    }

    if (appointment.status !== "SCHEDULED") {
      throw makeError("Only scheduled appointments can be cancelled.", 400);
    }

    if (!isFutureSlot(appointment.slot)) {
      throw makeError("This appointment can no longer be cancelled.", 400);
    }

    // Change only this donor's still-scheduled appointment.
    const cancelled = await tx.appointment.updateMany({
      where: {
        id: appointmentId,
        donorId,
        status: "SCHEDULED",
      },
      data: { status: "CANCELLED" },
    });

    if (cancelled.count !== 1) {
      throw makeError("The appointment has already changed. Refresh and retry.", 409);
    }

    const released = await tx.appointmentSlot.updateMany({
      where: {
        id: appointment.slotId,
        bookedCount: { gt: 0 },
      },
      data: {
        bookedCount: { decrement: 1 },
        isAvailable: true,
      },
    });

    if (released.count !== 1) {
      throw makeError(
        "The slot capacity could not be updated. No changes were saved.",
        409
      );
    }

    return tx.appointment.findUnique({
      where: { id: appointmentId },
      include: { slot: true },
    });
  });
}

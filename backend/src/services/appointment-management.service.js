/**
 * @file appointment-management.service.js
 * @description Donor appointment lifecycle management service allowing donors to view,
 * reschedule, and cancel their donation appointments while enforcing capacity rules,
 * future date constraints, and transactional consistency in accordance with US-013.
 */

import { z } from "zod";
import { prisma } from "../utils/prisma.js";

/**
 * Zod validation schema for appointment rescheduling payloads.
 */
const rescheduleSchema = z.object({
  slotId: z.string().trim().min(1, "Select an appointment slot."),
});

/**
 * Helper utility creating an Error object augmented with an HTTP status code.
 *
 * @param {string} message - Error description.
 * @param {number} status - Associated HTTP status code.
 * @returns {Error} Configured Error object.
 */
function makeError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

/**
 * Validates whether an appointment slot's combined date and start time occurs in the future.
 *
 * @param {{date: string, startTime: string} | null} slot - Slot data object containing date (YYYY-MM-DD) and startTime (HH:mm).
 * @returns {boolean} True if the slot begins strictly after the current UTC timestamp; false otherwise.
 */
function isFutureSlot(slot) {
  if (!slot) return false;
  return new Date(`${slot.date}T${slot.startTime}:00.000Z`) > new Date();
}

/**
 * Retrieves all appointments associated with a specific donor, including slot details.
 *
 * @async
 * @function getDonorAppointments
 * @param {string} donorId - Unique identifier of the authenticated donor.
 * @returns {Promise<Array<Object>>} List of appointment records ordered by creation date descending.
 */
export async function getDonorAppointments(donorId) {
  return prisma.appointment.findMany({
    where: { donorId },
    include: { slot: true },
    orderBy: [{ createdAt: "desc" }],
  });
}

/**
 * Reschedules an active donation appointment to a new slot within an atomic transaction.
 * 
 * Business Logic & Constraints:
 * 1. Verifies the existing appointment is in SCHEDULED status and associated with the caller.
 * 2. Confirms the current appointment slot is still in the future (past appointments cannot be rescheduled).
 * 3. Enforces that the target slot differs from the current slot.
 * 4. Ensures target slot exists, is in the future, is flagged available, and has remaining capacity.
 * 5. Atomically increments the booked count on the new slot (with concurrency lock checking capacity < maxCapacity).
 * 6. Decrements booked count on original slot and marks it available.
 * 7. Updates appointment record with the new slot reference.
 *
 * @async
 * @function rescheduleDonorAppointment
 * @param {string} donorId - Unique identifier of the donor.
 * @param {string} appointmentId - Unique identifier of the appointment to reschedule.
 * @param {{slotId: string}} input - Reschedule payload containing the new slot ID.
 * @returns {Promise<Object>} Updated appointment record with newly assigned slot relation.
 * @throws {Error} 404 if appointment or new slot is not found.
 * @throws {Error} 400 if appointment is not scheduled, in the past, or target slot is identical.
 * @throws {Error} 409 if new slot is full, unavailable, or concurrent update failed.
 */
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

/**
 * Cancels a donor's scheduled appointment and safely releases slot capacity.
 * 
 * Business Logic & Constraints:
 * 1. Validates appointment belongs to donor and is in SCHEDULED status.
 * 2. Confirms appointment is in the future.
 * 3. Atomically updates appointment status to CANCELLED.
 * 4. Decrements bookedCount on associated slot and re-flags slot as available.
 *
 * @async
 * @function cancelDonorAppointment
 * @param {string} donorId - Unique identifier of the donor.
 * @param {string} appointmentId - Unique identifier of the appointment being cancelled.
 * @returns {Promise<Object>} Updated appointment record with CANCELLED status.
 * @throws {Error} 404 if appointment not found.
 * @throws {Error} 400 if appointment is not scheduled or occurs in the past.
 * @throws {Error} 409 if status was concurrently altered or slot decrement fails.
 */
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

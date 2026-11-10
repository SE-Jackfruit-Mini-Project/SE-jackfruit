/**
 * @file appointment.service.js
 * @description Service module managing donor appointment booking and donor appointment history,
 * enforcing slot availability, capacity limits, and duplicate booking prevention in accordance with US-004.
 */

import { z } from "zod";
import { prisma } from "../utils/prisma.js";

/**
 * Zod validation schema for appointment booking requests.
 */
const bookingInputSchema = z.object({
  slotId: z.string().trim().min(1, "Please select an appointment slot."),
  notes: z.string().trim().max(255, "Notes cannot exceed 255 characters.").optional(),
});

/**
 * Books a donation appointment for an authenticated donor.
 * Requirements: US-004 (AC-4, AC-5, AC-6).
 * 
 * Process & Verification:
 * 1. Checks target slot existence.
 * 2. Validates availability flag and remaining capacity.
 * 3. Prevents duplicate active booking by the same donor on the same slot.
 * 4. Atomically creates appointment record and increments bookedCount within a transaction.
 * 5. Updates `isAvailable` boolean on slot if capacity is reached.
 *
 * @async
 * @function bookAppointment
 * @param {string} donorId - Unique identifier of the authenticated donor user.
 * @param {Object} input - Appointment booking input data.
 * @param {string} input.slotId - ID of the target appointment slot.
 * @param {string} [input.notes] - Optional donor notes or special instructions (max 255 chars).
 * @returns {Promise<Object>} Created appointment entity with attached slot details.
 * @throws {Error} 404 if slot does not exist.
 * @throws {Error} 400 if slot is full, unavailable, or donor already has an active booking.
 */
export async function bookAppointment(donorId, input) {
  const values = bookingInputSchema.parse(input);

  // 1. Check if the slot exists
  const slot = await prisma.appointmentSlot.findUnique({
    where: { id: values.slotId },
  });

  if (!slot) {
    const error = new Error("Selected appointment slot was not found.");
    error.status = 404;
    throw error;
  }

  // 2. Validate availability and capacity (AC-5)
  if (!slot.isAvailable || slot.bookedCount >= slot.maxCapacity) {
    const error = new Error("This appointment slot is full or no longer available.");
    error.status = 400;
    throw error;
  }

  // 3. Prevent duplicate active booking for the same slot by the same donor
  const existingBooking = await prisma.appointment.findFirst({
    where: {
      donorId,
      slotId: values.slotId,
      status: "SCHEDULED",
    },
  });

  if (existingBooking) {
    const error = new Error("You already have a scheduled booking for this slot.");
    error.status = 400;
    throw error;
  }

  // 4. Atomically create appointment and increment slot count (AC-4, AC-5, AC-6)
  const result = await prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.create({
      data: {
        donorId,
        slotId: values.slotId,
        notes: values.notes || null,
        status: "SCHEDULED",
      },
      include: {
        slot: true,
      },
    });

    const newBookedCount = slot.bookedCount + 1;
    await tx.appointmentSlot.update({
      where: { id: values.slotId },
      data: {
        bookedCount: newBookedCount,
        isAvailable: newBookedCount < slot.maxCapacity,
      },
    });

    return appointment;
  });

  return result;
}

/**
 * Retrieves all appointments booked by a specific donor, ordered chronologically descending.
 *
 * @async
 * @function getDonorAppointments
 * @param {string} donorId - Unique identifier of the authenticated donor.
 * @returns {Promise<Array<Object>>} List of appointments booked by the donor.
 */
export async function getDonorAppointments(donorId) {
  return prisma.appointment.findMany({
    where: { donorId },
    include: {
      slot: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

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
  weightKg: z.coerce.number().finite("Enter a valid weight.").min(45, "You must weigh at least 45 kg to book an appointment."),
  notes: z.string().trim().max(255, "Notes cannot exceed 255 characters.").optional(),
});

function calculateAge(dateOfBirth, at = new Date()) {
  let age = at.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  if (at.getUTCMonth() < dateOfBirth.getUTCMonth()
    || (at.getUTCMonth() === dateOfBirth.getUTCMonth() && at.getUTCDate() < dateOfBirth.getUTCDate())) age -= 1;
  return age;
}

function addCalendarMonths(date, months) {
  const targetMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    targetMonth.getUTCFullYear(), targetMonth.getUTCMonth(), Math.min(date.getUTCDate(), lastDay),
    date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds(),
  ));
}

function rejectBooking(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

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

  const donor = await prisma.user.findUnique({
    where: { id: donorId },
    select: { role: true, dateOfBirth: true, gender: true },
  });
  if (!donor || donor.role !== "DONOR") rejectBooking("Only donor accounts can book appointments.");
  if (!donor.dateOfBirth || !donor.gender) {
    rejectBooking("Complete your date of birth and gender in your donor profile before booking.");
  }
  const age = calculateAge(donor.dateOfBirth);
  if (age < 18 || age > 65) rejectBooking("You must be between 18 and 65 years old to book an appointment.");

  const intervalMonths = donor.gender === "FEMALE" ? 4 : donor.gender === "MALE" ? 3 : null;
  if (!intervalMonths) rejectBooking("Your donor profile has an unsupported gender value. Please contact the blood bank.");
  const previousDonation = await prisma.donation.findFirst({
    where: { donorId, accepted: true },
    orderBy: [{ donationDate: "desc" }, { createdAt: "desc" }],
    select: { donationDate: true },
  });
  if (previousDonation) {
    const allowedFrom = addCalendarMonths(previousDonation.donationDate, intervalMonths);
    if (new Date() < allowedFrom) {
      rejectBooking(`You can book your next appointment on or after ${allowedFrom.toISOString().slice(0, 10)}.`);
    }
  }

  // 1. Check if the slot exists
  const slot = await prisma.appointmentSlot.findUnique({
    where: { id: values.slotId },
  });

  if (!slot) {
    const error = new Error("Selected appointment slot was not found.");
    error.status = 404;
    throw error;
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentTime = now.toISOString().slice(11, 16);
  if (slot.date < today || (slot.date === today && slot.startTime <= currentTime)) {
    const error = new Error("This appointment slot has already started or passed. Please choose an upcoming slot.");
    error.status = 400;
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
        weightKg: values.weightKg,
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

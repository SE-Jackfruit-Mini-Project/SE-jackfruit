/**
 * @file appointment-slot.service.js
 * @description Service module managing the creation, scheduling availability, and querying
 * of blood donation appointment slots, enforcing chronological constraints, slot overlap
 * prevention, and non-negative capacity bounds in accordance with US-009.
 */

import { z } from "zod";
import { prisma } from "../utils/prisma.js";

/** Regex pattern for validating 24-hour time in HH:mm format */
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Regex pattern for validating ISO date format YYYY-MM-DD */
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Zod validation schema for appointment slot creation.
 * Enforces:
 * - Date must be formatted as YYYY-MM-DD and cannot be in the past.
 * - Start and end times must match 24-hour HH:mm pattern.
 * - End time must strictly follow start time.
 * - Capacity must be a whole positive integer between 1 and 100.
 */
const slotInputSchema = z
  .object({
    date: z
      .string()
      .trim()
      .regex(dateRegex, "Date must be in YYYY-MM-DD format.")
      .refine((val) => {
        const today = new Date().toISOString().slice(0, 10);
        return val >= today;
      }, "Slot date cannot be in the past."),
    startTime: z.string().trim().regex(timeRegex, "Start time must be in HH:mm format."),
    endTime: z.string().trim().regex(timeRegex, "End time must be in HH:mm format."),
    maxCapacity: z.coerce
      .number()
      .int("Capacity must be a whole number.")
      .positive("Slot capacity must be at least 1.")
      .max(100, "Slot capacity cannot exceed 100."),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "End time must be after start time.",
    path: ["endTime"],
  });

/**
 * Creates a new appointment slot after validating time ranges and preventing overlaps.
 *
 * @async
 * @function createAppointmentSlot
 * @param {Object} input - Appointment slot attributes.
 * @param {string} input.date - Date in YYYY-MM-DD format (must be today or future).
 * @param {string} input.startTime - Start time in HH:mm format.
 * @param {string} input.endTime - End time in HH:mm format.
 * @param {number} input.maxCapacity - Maximum donor capacity for this time window.
 * @returns {Promise<Object>} Created appointment slot entity.
 * @throws {Error} 409 if slot overlaps with an existing slot on the specified date.
 * @throws {z.ZodError} If input schema constraints fail.
 */
export async function createAppointmentSlot(input) {
  const values = slotInputSchema.parse(input);

  // Check for exact duplicate or overlapping slot on the same date
  const existingSlots = await prisma.appointmentSlot.findMany({
    where: { date: values.date },
  });

  const hasOverlap = existingSlots.some((slot) => {
    return values.startTime < slot.endTime && values.endTime > slot.startTime;
  });

  if (hasOverlap) {
    const error = new Error("An appointment slot already exists or overlaps with this time window on the selected date.");
    error.status = 409;
    throw error;
  }

  const slot = await prisma.appointmentSlot.create({
    data: {
      date: values.date,
      startTime: values.startTime,
      endTime: values.endTime,
      maxCapacity: values.maxCapacity,
      bookedCount: 0,
      isAvailable: true,
    },
  });

  return slot;
}

/**
 * Retrieves all appointment slots regardless of past status or availability,
 * ordered chronologically by date and start time.
 *
 * @async
 * @function getAllSlots
 * @returns {Promise<Array<Object>>} List of all appointment slots.
 */
export async function getAllSlots() {
  return prisma.appointmentSlot.findMany({
    orderBy: [
      { date: "asc" },
      { startTime: "asc" },
    ],
  });
}

/**
 * Retrieves upcoming appointment slots currently marked as available,
 * starting from the current calendar date onward.
 *
 * @async
 * @function getAvailableSlots
 * @returns {Promise<Array<Object>>} List of upcoming available appointment slots.
 */
export async function getAvailableSlots() {
  const today = new Date().toISOString().slice(0, 10);

  return prisma.appointmentSlot.findMany({
    where: {
      date: { gte: today },
      isAvailable: true,
    },
    orderBy: [
      { date: "asc" },
      { startTime: "asc" },
    ],
  });
}

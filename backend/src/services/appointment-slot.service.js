import { z } from "zod";
import { prisma } from "../utils/prisma.js";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

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

export async function getAllSlots() {
  return prisma.appointmentSlot.findMany({
    orderBy: [
      { date: "asc" },
      { startTime: "asc" },
    ],
  });
}

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

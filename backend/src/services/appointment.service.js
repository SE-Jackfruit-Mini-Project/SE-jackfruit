import { z } from "zod";
import { prisma } from "../utils/prisma.js";

const bookingInputSchema = z.object({
  slotId: z.string().trim().min(1, "Please select an appointment slot."),
  notes: z.string().trim().max(255, "Notes cannot exceed 255 characters.").optional(),
});

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

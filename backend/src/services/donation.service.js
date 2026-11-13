/**
 * @file donation.service.js
 * @description Service module managing the recording of completed blood donations by healthcare staff,
 * verifying donor registration, validating calendar dates and units, and synchronizing accepted donations
 * directly into blood inventory and movement logs in accordance with US-011 (FR-022).
 */

import { z } from "zod";
import { prisma } from "../utils/prisma.js";
import { deriveStatus } from "./inventory.service.js";
import { addCalendarMonths } from "./appointment.service.js";

/**
 * Zod validation schema for recording a donation event.
 * Enforces:
 * - donorId must be non-empty string.
 * - units must be integer between 1 and 50.
 * - donationDate must be valid YYYY-MM-DD not in the future.
 * - accepted must be explicitly provided boolean.
 * - notes optional, max 255 characters.
 */
const donationSchema = z.object({
  donorId: z.string().trim().min(1, "Select a registered donor."),

  units: z.coerce
    .number()
    .int("Units must be a whole number.")
    .positive("Units must be at least 1.")
    .max(50, "Units cannot exceed 50 per donation."),

  donationDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid donation date.")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);

      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    }, "Enter a real calendar date.")
    .refine(
      (value) => value <= new Date().toISOString().slice(0, 10),
      "Donation date cannot be in the future."
    ),

  accepted: z.boolean({
    required_error: "Choose whether the donation was accepted.",
    invalid_type_error: "Choose whether the donation was accepted.",
  }),

  notes: z
    .string()
    .trim()
    .max(255, "Notes cannot exceed 255 characters.")
    .optional(),
}).strict();

/**
 * Retrieves donors with a recorded blood group and at least one appointment for donation intake.
 *
 * @async
 * @function getRegisteredDonors
 * @returns {Promise<Array<{id: string, fullName: string, email: string, bloodGroup: string}>>} Eligible appointment donors sorted alphabetically.
 */
export async function getRegisteredDonors() {
  const donors = await prisma.user.findMany({
    where: {
      role: "DONOR",
      bloodGroup: { not: null },
      appointments: { some: {} },
    },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      bloodGroup: true,
    },
  });

  if (!prisma.appointment?.findFirst || !prisma.donation?.findFirst) {
    return donors;
  }

  const now = new Date();
  const eligibleDonors = [];

  for (const donor of donors) {
    // Check if donor has an active scheduled appointment
    const scheduledAppointment = await prisma.appointment.findFirst({
      where: {
        donorId: donor.id,
        status: "SCHEDULED",
      },
      include: { slot: true },
      orderBy: [{ createdAt: "asc" }],
    });

    if (!scheduledAppointment) {
      continue;
    }

    // Check if blood has already been drawn for this appointment slot date
    const slotDate = scheduledAppointment.slot?.date;
    if (slotDate) {
      const existingDonation = await prisma.donation.findFirst({
        where: {
          donorId: donor.id,
          donationDate: new Date(`${slotDate}T00:00:00.000Z`),
        },
      });
      if (existingDonation) {
        continue;
      }
    }

    // Check gender-based waiting period from previous accepted donation
    const donorUser = await prisma.user.findUnique({
      where: { id: donor.id },
      select: { gender: true },
    });
    const intervalMonths = donorUser?.gender === "FEMALE" ? 4 : donorUser?.gender === "MALE" ? 3 : null;

    if (intervalMonths) {
      const previousDonation = await prisma.donation.findFirst({
        where: { donorId: donor.id, accepted: true },
        orderBy: [{ donationDate: "desc" }, { createdAt: "desc" }],
        select: { donationDate: true },
      });
      if (previousDonation) {
        const allowedFrom = addCalendarMonths(previousDonation.donationDate, intervalMonths);
        if (now < allowedFrom) {
          continue;
        }
      }
    }

    eligibleDonors.push(donor);
  }

  return eligibleDonors;
}

/**
 * Retrieves the 50 most recent donation records with donor and staff recorder details.
 *
 * @async
 * @function getRecentDonations
 * @returns {Promise<Array<Object>>} List of recent donations.
 */
export async function getRecentDonations() {
  return prisma.donation.findMany({
    take: 50,
    orderBy: [
      { donationDate: "desc" },
      { createdAt: "desc" },
    ],
    include: {
      donor: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      recordedBy: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });
}

/**
 * Records a completed blood donation by medical staff.
 * Requirements: US-011 / FR-022.
 * 
 * Transactional Behavior:
 * 1. Confirms donor has the DONOR role, a saved blood group, and an appointment.
 * 2. Inserts donation row linking donor and recording staff member.
 * 3. If accepted is true:
 *    - Upserts inventory row for target blood group, incrementing availableUnits.
 *    - Recomputes and updates inventory status (AVAILABLE, LOW, OUT_OF_STOCK).
 *    - Records an audit InventoryMovement row of type DONATION with reference to the donation ID.
 *
 * @async
 * @function recordCompletedDonation
 * @param {string} staffId - ID of the staff member recording the donation.
 * @param {Object} input - Donation input payload matching donationSchema.
 * @returns {Promise<{donation: Object, inventoryUpdated: boolean}>} Recorded donation and inventory update confirmation.
 * @throws {Error} 404 if donor is not found or not a DONOR.
 * @throws {z.ZodError} If input schema constraints fail.
 */
export async function recordCompletedDonation(staffId, input) {
  const values = donationSchema.parse(input);

  const donationDate = new Date(
    `${values.donationDate}T00:00:00.000Z`
  );

  return prisma.$transaction(async (tx) => {
    const donor = await tx.user.findFirst({
      where: {
        id: values.donorId,
        role: "DONOR",
        bloodGroup: { not: null },
        appointments: { some: {} },
      },
      select: {
        id: true,
        bloodGroup: true,
        gender: true,
      },
    });

    if (!donor) {
      const error = new Error("The selected donor must have a saved blood group and an appointment.");
      error.status = 404;
      throw error;
    }

    // 1. Verify the donor has an active scheduled appointment
    let matchingAppointment = null;
    if (tx.appointment?.findMany) {
      const donorAppointments = await tx.appointment.findMany({
        where: {
          donorId: donor.id,
        },
      });

      matchingAppointment = donorAppointments.find(
        (appt) => !appt.status || appt.status === "SCHEDULED"
      );

      if (!matchingAppointment && donorAppointments.length > 0) {
        const error = new Error("This donor does not have an active scheduled appointment slot.");
        error.status = 400;
        throw error;
      }
    }

    // 2. Prevent drawing blood from the same person in the same slot more than once
    if (tx.donation?.findFirst) {
      const existingDonation = await tx.donation.findFirst({
        where: {
          donorId: donor.id,
          donationDate,
        },
      });

      if (existingDonation) {
        const error = new Error("Blood has already been drawn from this donor for this appointment slot.");
        error.status = 400;
        throw error;
      }
    }

    // 3. Prevent drawing blood before the gender-based waiting period has elapsed
    if (tx.donation?.findFirst && donor.gender) {
      const intervalMonths = donor.gender === "FEMALE" ? 4 : donor.gender === "MALE" ? 3 : null;
      if (intervalMonths) {
        const previousDonation = await tx.donation.findFirst({
          where: { donorId: donor.id, accepted: true },
          orderBy: [{ donationDate: "desc" }, { createdAt: "desc" }],
          select: { donationDate: true },
        });

        if (previousDonation) {
          const allowedFrom = addCalendarMonths(previousDonation.donationDate, intervalMonths);
          if (donationDate < allowedFrom) {
            const allowedDateStr = allowedFrom.toISOString().slice(0, 10);
            const error = new Error(
              `Donor is not eligible to donate until ${allowedDateStr} based on the waiting period for their gender.`
            );
            error.status = 400;
            throw error;
          }
        }
      }
    }

    const donation = await tx.donation.create({
      data: {
        donorId: donor.id,
        recordedById: staffId,
        bloodGroup: donor.bloodGroup,
        units: values.units,
        donationDate,
        accepted: values.accepted,
        notes: values.notes || null,
      },
      include: {
        donor: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        recordedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    // 4. Mark the appointment as COMPLETED so blood cannot be drawn again for this slot
    if (matchingAppointment && tx.appointment?.update) {
      await tx.appointment.update({
        where: { id: matchingAppointment.id },
        data: { status: "COMPLETED" },
      });
    }

    if (values.accepted) {
      const inventoryRow = await tx.inventory.upsert({
        where: {
          bloodGroup: donor.bloodGroup,
        },
        create: {
          bloodGroup: donor.bloodGroup,
          availableUnits: values.units,
          status: deriveStatus(values.units),
        },
        update: {
          availableUnits: {
            increment: values.units,
          },
        },
      });

      const status = deriveStatus(inventoryRow.availableUnits);

      const inventory =
        status === inventoryRow.status
          ? inventoryRow
          : await tx.inventory.update({
              where: { id: inventoryRow.id },
              data: { status },
            });
      await tx.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          type: "DONATION",
          delta: values.units,
          reason: `Accepted donation ${donation.id}`.slice(0, 200),
          referenceId: donation.id,
          actorId: staffId,
        },
      });
    }

    return {
      donation,
      inventoryUpdated: values.accepted,
    };
  });
}

/**
 * @file donation.service.js
 * @description Service module managing the recording of completed blood donations by healthcare staff,
 * verifying donor registration, validating calendar dates and units, and synchronizing accepted donations
 * directly into blood inventory and movement logs in accordance with US-011 (FR-022).
 */

import { z } from "zod";
import { prisma } from "../utils/prisma.js";
import { deriveStatus } from "./inventory.service.js";

/**
 * Standard list of acceptable blood group enumerations.
 */
const bloodGroups = [
  "A_POSITIVE",
  "A_NEGATIVE",
  "B_POSITIVE",
  "B_NEGATIVE",
  "AB_POSITIVE",
  "AB_NEGATIVE",
  "O_POSITIVE",
  "O_NEGATIVE",
];

/**
 * Zod validation schema for recording a donation event.
 * Enforces:
 * - donorId must be non-empty string.
 * - bloodGroup must be a valid enum member.
 * - units must be integer between 1 and 50.
 * - donationDate must be valid YYYY-MM-DD not in the future.
 * - accepted must be explicitly provided boolean.
 * - notes optional, max 255 characters.
 */
const donationSchema = z.object({
  donorId: z.string().trim().min(1, "Select a registered donor."),

  bloodGroup: z.enum(bloodGroups, {
    errorMap: () => ({
      message: "Select a valid blood group.",
    }),
  }),

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
 * Retrieves all registered users with the DONOR role for staff selection during donation intake.
 *
 * @async
 * @function getRegisteredDonors
 * @returns {Promise<Array<{id: string, fullName: string, email: string}>>} List of registered donors sorted alphabetically.
 */
export async function getRegisteredDonors() {
  return prisma.user.findMany({
    where: { role: "DONOR" },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  });
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
 * 1. Confirms donor user exists and has role DONOR.
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
      },
      select: {
        id: true,
      },
    });

    if (!donor) {
      const error = new Error("The selected donor was not found.");
      error.status = 404;
      throw error;
    }

    const donation = await tx.donation.create({
      data: {
        donorId: donor.id,
        recordedById: staffId,
        bloodGroup: values.bloodGroup,
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

    if (values.accepted) {
      const inventoryRow = await tx.inventory.upsert({
        where: {
          bloodGroup: values.bloodGroup,
        },
        create: {
          bloodGroup: values.bloodGroup,
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

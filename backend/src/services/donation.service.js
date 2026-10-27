import { z } from "zod";
import { prisma } from "../utils/prisma.js";

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
      const inventory = await tx.inventory.upsert({
        where: {
          bloodGroup: values.bloodGroup,
        },
        create: {
          bloodGroup: values.bloodGroup,
          availableUnits: values.units,
          status: "AVAILABLE",
        },
        update: {
          availableUnits: {
            increment: values.units,
          },
          status: "AVAILABLE",
        },
        select: {
          id: true,
        },
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
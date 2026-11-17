import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with default demo data...");

  const passwordHash = await bcrypt.hash("Password123!", 12);

  const defaultUsers = [
    {
      fullName: "Vedanth Kiran",
      email: "vedanth@gmail.com",
      role: "ADMIN",
      gender: "MALE",
      bloodGroup: "O_POSITIVE",
      dateOfBirth: new Date("1995-05-15"),
    },
    {
      fullName: "Tusti S",
      email: "tusti@gmail.com",
      role: "STAFF",
      gender: "FEMALE",
      bloodGroup: "A_POSITIVE",
      dateOfBirth: new Date("1997-08-20"),
    },
    {
      fullName: "Pavithra Reddy",
      email: "pavithra@gmail.com",
      role: "HOSPITAL_REQUESTER",
      gender: "FEMALE",
      bloodGroup: "B_POSITIVE",
      dateOfBirth: new Date("1998-03-10"),
    },
    {
      fullName: "Vrushant K P",
      email: "vrushant@gmail.com",
      role: "DONOR",
      gender: "MALE",
      bloodGroup: "B_POSITIVE",
      dateOfBirth: new Date("2000-01-25"),
    },
  ];

  for (const user of defaultUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        ...user,
        passwordHash,
        isActive: true,
      },
    });
  }

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

  for (const group of bloodGroups) {
    await prisma.inventory.upsert({
      where: { bloodGroup: group },
      update: {},
      create: {
        bloodGroup: group,
        availableUnits: 10,
        status: "AVAILABLE",
      },
    });
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

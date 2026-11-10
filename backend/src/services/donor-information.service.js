import { prisma } from "../utils/prisma.js";

const donorSummarySelection = {
  id: true,
  fullName: true,
  email: true,
  createdAt: true,
};

export async function listDonors() {
  return prisma.user.findMany({
    where: { role: "DONOR" },
    orderBy: { fullName: "asc" },
    select: donorSummarySelection,
  });
}

export async function getDonorInformation(donorId) {
  return prisma.user.findFirst({
    where: { id: donorId, role: "DONOR" },
    select: donorSummarySelection,
  });
}

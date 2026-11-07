import { prisma } from "../utils/prisma.js";

export async function getDonationHistory(donorId) {
  return prisma.donation.findMany({
    where: { donorId, accepted: true },
    orderBy: [{ donationDate: "desc" }, { createdAt: "desc" }],
    select: { id: true, bloodGroup: true, units: true, donationDate: true, accepted: true, notes: true },
  });
}

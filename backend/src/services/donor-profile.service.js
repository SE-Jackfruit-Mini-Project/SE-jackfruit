import { prisma } from "../utils/prisma.js";

const profileSelection = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  createdAt: true,
};

export async function getDonorProfile(userId) {
  return prisma.user.findFirst({
    where: { id: userId, role: "DONOR" },
    select: profileSelection,
  });
}

export async function updateDonorProfile(userId, fullName) {
  const result = await prisma.user.updateMany({
    where: { id: userId, role: "DONOR" },
    data: { fullName },
  });

  if (result.count === 0) {
    return null;
  }

  return getDonorProfile(userId);
}

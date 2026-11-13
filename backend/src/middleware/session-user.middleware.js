import { prisma } from '../utils/prisma.js';

// Refresh persisted identity before authorization; sessions must not retain revoked roles.
export async function syncSessionUser(request, response, next) {
  if (!request.session?.user) return next();
  try {
    const user = await prisma.user.findUnique({
      where: { id: request.session.user.id },
      select: { id: true, fullName: true, email: true, role: true, isActive: true,
        dateOfBirth: true, gender: true, bloodGroup: true, createdAt: true },
    });
    if (!user || user.isActive === false) {
      return request.session.destroy((error) => {
        if (error) return next(error);
        response.clearCookie('sid');
        return response.status(401).json({ message: 'Your account is unavailable. Please log in again.' });
      });
    }
    request.session.user = user;
    return next();
  } catch (error) { return next(error); }
}

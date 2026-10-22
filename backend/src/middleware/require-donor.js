export function requireDonor(request, response, next) {
  // The authentication layer must attach the verified database user to request.user.
  if (!request.user?.id) {
    return response.status(401).json({ message: "Please log in to access your donor profile." });
  }

  if (request.user.role !== "DONOR") {
    return response.status(403).json({ message: "Only donors can access this profile." });
  }

  return next();
}

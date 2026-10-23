export function requireAuth(request, response, next) {
  if (!request.session?.user) {
    return response.status(401).json({ message: "Authentication required." });
  }
  next();
}

export function requireRole(...roles) {
  return (request, response, next) => {
    if (!request.session?.user) {
      return response.status(401).json({ message: "Authentication required." });
    }
    if (!roles.includes(request.session.user.role)) {
      return response.status(403).json({ message: "You do not have permission to perform this action." });
    }
    next();
  };
}

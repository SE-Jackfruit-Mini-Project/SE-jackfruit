/**
 * @file auth.middleware.js
 * @description Authentication and Role-Based Access Control (RBAC) Express middleware.
 * Verifies active session presence, account active status, and permitted role authorization.
 */

/**
 * Middleware that ensures an active authenticated session exists and the account is not deactivated.
 *
 * @param {import("express").Request} request - Express request object containing session state.
 * @param {import("express").Response} response - Express response object for error dispatch.
 * @param {import("express").NextFunction} next - Express next middleware dispatch function.
 * @returns {void|import("express").Response}
 */
export function requireAuth(request, response, next) {
  // Verify session existence
  if (!request.session?.user) {
    return response.status(401).json({ message: "Authentication required." });
  }

  // Enforce account active status (FR-040: Deactivated accounts cannot access protected functionality)
  if (request.session.user.isActive === false) {
    return response.status(403).json({ message: "Your account has been deactivated." });
  }

  next();
}

/**
 * Higher-order middleware factory that enforces role-based access authorization against permitted roles.
 *
 * @param {...string} roles - Permitted user roles (e.g. "STAFF", "ADMIN", "HOSPITAL_REQUESTER", "DONOR").
 * @returns {import("express").RequestHandler} Express middleware handler.
 */
export function requireRole(...roles) {
  return (request, response, next) => {
    // Verify session existence
    if (!request.session?.user) {
      return response.status(401).json({ message: "Authentication required." });
    }

    // Enforce account active status
    if (request.session.user.isActive === false) {
      return response.status(403).json({ message: "Your account has been deactivated." });
    }

    // Verify user role membership in permitted role set
    if (!roles.includes(request.session.user.role)) {
      return response.status(403).json({ message: "You do not have permission to perform this action." });
    }

    next();
  };
}

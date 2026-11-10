/**
 * @file app.js
 * @description Express Application Definition and Middleware Pipeline.
 * Configures global body parsers, persistent PostgreSQL session store,
 * health check endpoints, modular REST API route mounts, and global error handling.
 */

import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

// Domain route handlers
import { authRouter } from "./routes/auth.routes.js";
import { donorProfileRouter } from "./routes/donor-profile.routes.js";
import { requestRouter } from "./routes/request.routes.js";
import { appointmentSlotRouter } from "./routes/appointment-slot.routes.js";
import { appointmentRouter } from "./routes/appointment.routes.js";
import { inventoryRouter } from "./routes/inventory.routes.js";
import { allocationRouter } from "./routes/allocation.routes.js";
import { donationRouter } from "./routes/donation.routes.js";
import { donationHistoryRouter } from "./routes/donation-history.routes.js";
import { appointmentManagementRouter } from "./routes/appointment-management.routes.js";
import { donorInformationRouter } from "./routes/donor-information.routes.js";
import { adminRouter } from "./routes/admin.routes.js";

// Initialize PostgreSQL session storage adapter
const PgStore = connectPgSimple(session);

export const app = express();

// Global request body parser with payload size restriction for security
app.use(express.json({ limit: "16kb" }));

// Server-side session management with PostgreSQL persistence
app.use(
  session({
    store: new PgStore({
      conString: process.env.DATABASE_URL,
      tableName: "sessions",
      createTableIfMissing: true,
    }),
    name: "sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000, // 8 hours session duration
    },
  })
);

// Health check endpoint for uptime probes and load balancers
app.get("/api/v1/health", (_request, response) => {
  response.json({ status: "ok" });
});

// Mount domain-specific REST API routers
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/donors", donorProfileRouter);
app.use("/api/v1/requests", requestRouter);
app.use("/api/v1/appointment-slots", appointmentSlotRouter);
app.use("/api/v1/appointments", appointmentRouter);
app.use("/api/v1/inventory", inventoryRouter);
app.use("/api/v1/allocations", allocationRouter);
app.use("/api/v1/donations", donationRouter);
app.use("/api/v1/donation-history", donationHistoryRouter);
app.use("/api/v1/appointment-management", appointmentManagementRouter);
app.use("/api/v1/donor-information", donorInformationRouter);
app.use("/api/v1/admin", adminRouter);

// Centralized error-handling middleware
app.use((error, _request, response, _next) => {
  // Handle invalid JSON body syntax errors
  if (error?.type === "entity.parse.failed") {
    return response.status(400).json({
      message: "Request body must be valid JSON.",
    });
  }

  console.error("Unhandled request error", error);

  // Return generic 500 error response to prevent leaking internal stack traces
  return response.status(500).json({
    message: "The request could not be completed.",
  });
});

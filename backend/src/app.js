
import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

import { authRouter } from "./routes/auth.routes.js";
import { donorProfileRouter } from "./routes/donor-profile.routes.js";
import { requestRouter } from "./routes/request.routes.js";
import { appointmentSlotRouter } from "./routes/appointment-slot.routes.js";
import { appointmentRouter } from "./routes/appointment.routes.js";
import { inventoryRouter } from "./routes/inventory.routes.js";

const PgStore = connectPgSimple(session);

export const app = express();

app.use(express.json({ limit: "16kb" }));

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
      maxAge: 8 * 60 * 60 * 1000,
    },
  })
);

app.get("/api/v1/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/donors", donorProfileRouter);
app.use("/api/v1/requests", requestRouter);
app.use("/api/v1/appointment-slots", appointmentSlotRouter);
app.use("/api/v1/appointments", appointmentRouter);
app.use("/api/v1/inventory", inventoryRouter);

app.use((error, _request, response, _next) => {
  if (error?.type === "entity.parse.failed") {
    return response.status(400).json({
      message: "Request body must be valid JSON.",
    });
  }

  console.error("Unhandled request error", error);

  return response.status(500).json({
    message: "The request could not be completed.",
  });
});

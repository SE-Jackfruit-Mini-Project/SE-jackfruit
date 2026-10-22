import express from "express";
import { authRouter } from "./routes/auth.routes.js";
import { donorProfileRouter } from "./routes/donor-profile.routes.js";

export const app = express();

app.use(express.json({ limit: "16kb" }));
app.get("/api/v1/health", (_request, response) => {
  response.json({ status: "ok" });
});
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/donors", donorProfileRouter);

app.use((error, _request, response, _next) => {
  if (error?.type === "entity.parse.failed") {
    return response.status(400).json({ message: "Request body must be valid JSON." });
  }

  console.error("Unhandled request error", error);
  return response.status(500).json({ message: "The request could not be completed." });
});

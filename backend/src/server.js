/**
 * @file server.js
 * @description HTTP Server Entrypoint for the Blood Donation Management System.
 * Loads environment configurations, binds the Express application to the designated port,
 * and initializes inbound connection listening.
 */

import "dotenv/config";
import { app } from "./app.js";

// Determine the operational port from environment variables, defaulting to 3000
const port = Number(process.env.PORT) || 3000;

// Start listening for inbound HTTP requests
app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});

/**
 * @file vite.config.js
 * @description Vite bundler configuration for Jackfruit React frontend.
 * Configures the @vitejs/plugin-react plugin and reverse proxy rules routing `/api` requests
 * to the Express backend development server running on port 3000.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});

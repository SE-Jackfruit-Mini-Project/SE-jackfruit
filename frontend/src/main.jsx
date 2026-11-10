/**
 * @file main.jsx
 * @description Frontend application entrypoint. Mounts the React component tree into the root DOM node,
 * wraps application in BrowserRouter, and establishes client-side route routing across public,
 * authentication, donor, staff, and admin views.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { App as RegisterPage } from "./registration/App.jsx";
import { LoginPage } from "./login/LoginPage.jsx";
import { Dashboard } from "./dashboard/Dashboard.jsx";
import { ProfilePage } from "./profile/ProfilePage.jsx";
import { EligibilityPage } from "./eligibility/EligibilityPage.jsx";
import "./styles.css";

// Mount the root React component tree into the HTML element with id "root"
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public donor registration */}
        <Route path="/register" element={<RegisterPage />} />

        {/* Public authentication login */}
        <Route path="/login" element={<LoginPage />} />

        {/* Unified role-based dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Donor profile self-service */}
        <Route path="/profile" element={<ProfilePage />} />

        {/* Informational donor eligibility guidance */}
        <Route path="/eligibility" element={<EligibilityPage />} />

        {/* Fallback wildcard redirecting unmapped paths to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);

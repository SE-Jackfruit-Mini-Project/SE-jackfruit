import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { App as RegisterPage } from "./registration/App.jsx";
import { LoginPage } from "./login/LoginPage.jsx";
import { Dashboard } from "./dashboard/Dashboard.jsx";
import { ProfilePage } from "./profile/ProfilePage.jsx";
import { EligibilityPage } from "./eligibility/EligibilityPage.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/eligibility" element={<EligibilityPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);

import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./registration/App.jsx";
import { ProfilePage } from "./profile/ProfilePage.jsx";
import "./styles.css";

const Page = window.location.pathname === "/profile" ? ProfilePage : App;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Page />
  </React.StrictMode>,
);

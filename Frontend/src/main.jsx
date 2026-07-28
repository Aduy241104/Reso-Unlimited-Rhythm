import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { getStoredAccessToken } from "./services/authStorage";
import { getOrCreateGuestId } from "./services/guestIdentity";

if (!getStoredAccessToken()) {
  getOrCreateGuestId();
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

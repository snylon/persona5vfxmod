import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import CaretakerApp from "./Caretaker";
import "./index.css";

function Root() {
  const [role, setRole] = useState<"patient" | "caretaker">("patient");
  return role === "caretaker" ? (
    <CaretakerApp onSwitch={() => setRole("patient")} />
  ) : (
    <App onSwitchToCaretaker={() => setRole("caretaker")} />
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);

// Keep the development preview on HMR; only published builds use the app worker.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
      })
      .catch(() => {
        // Installation is optional; Bloom remains usable without a service worker.
      });
  });
}

import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";

const router = getRouter();

let installPromptEvent: BeforeInstallPromptEvent | null = null;

window.addEventListener("error", (event) => {
  console.error("Runtime error:", event.error ?? event.message);
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPromptEvent = event as BeforeInstallPromptEvent;
});

window.addEventListener("appinstalled", () => {
  installPromptEvent = null;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);

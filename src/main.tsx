import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { LoadingOverlay } from "./WorkspaceLoader";
import { App } from "./App";
import { PwaInstall } from "./PwaInstall";
import "./style.css";
import "./pwa.css";
import "./ui.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <PwaInstall />
      <LoadingOverlay />
    </BrowserRouter>
  </React.StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => { /* The online app remains usable if installation is unavailable. */ });
  });
}

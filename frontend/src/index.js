import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { HelmetProvider } from "react-helmet-async";
import * as serviceWorker from "./serviceWorker";

const container = document.getElementById("root");
const root = createRoot(container);
root.render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

serviceWorker.unregister(); // or register() based on your requirement

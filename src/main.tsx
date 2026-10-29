import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ready } from "./lib/telegram";
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/glass.css";
import "./styles/site.css";

ready();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

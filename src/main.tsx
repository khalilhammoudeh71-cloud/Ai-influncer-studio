import { MotionConfig } from "framer-motion";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
    <ErrorBoundary fallbackTitle="Studio Session Interrupted">
      <App />
    </ErrorBoundary>
    </MotionConfig>
  </StrictMode>
);

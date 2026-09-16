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

// Register only in production; updates activate naturally after existing tabs close.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const register = () => { navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
    .catch(error => console.warn('Offline notice unavailable:', error)); };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

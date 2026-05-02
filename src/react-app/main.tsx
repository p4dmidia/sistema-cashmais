import { createRoot } from "react-dom/client";
import "@/react-app/index.css";
import App from "@/react-app/App.tsx";
import { registerSW } from 'virtual:pwa-register';

// Registra o Service Worker para suporte PWA
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <App />
);

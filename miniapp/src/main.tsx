import React from "react";
import { createRoot } from "react-dom/client";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { App } from "./App";
import "./styles.css";

async function bootstrap() {
  const config = await fetch("/api/config").then((res) => res.json());
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <TonConnectUIProvider manifestUrl={config.manifestUrl}>
        <App defaultSlippage={config.defaultSlippage} />
      </TonConnectUIProvider>
    </React.StrictMode>
  );
}

bootstrap().catch((error) => {
  document.body.textContent = error instanceof Error ? error.message : "Failed to load app";
});

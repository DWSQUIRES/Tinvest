import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  build: {
    outDir: "../dist/miniapp",
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:3000",
      "/tonconnect-manifest.json": "http://127.0.0.1:3000"
    }
  }
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// UI-02 (Issue #33) — Vite + React + Tailwind CSS v4 per ARCH-01 proposal §6/§7.
// Dev: Vite on 5173 proxying /api to the Express backend on 3000 (ARCH §6.1).
// Production: `vite build` emits client/dist, served by Express (SDS §2.1 record).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});

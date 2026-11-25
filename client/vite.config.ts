import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The end-to-end tests run their own stack on other ports, next to a
    // dev server that may already be running (CLIENT_PORT, API_URL).
    port: Number(process.env.CLIENT_PORT) || 3000,
    // Every request starting with /api is sent to the Express server.
    proxy: {
      "/api": process.env.API_URL ?? "http://localhost:3310",
    },
  },
});

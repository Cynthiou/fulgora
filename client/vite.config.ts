import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Every request starting with /api is sent to the Express server.
    proxy: {
      "/api": "http://localhost:3310",
    },
  },
});

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // US-45: Fulgora is installable on a phone. The service worker keeps
    // the interface (and only the interface) so the app opens at the gym;
    // the answers of the API are never cached, they belong to one user and
    // change all the time.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "favicon.ico", "icons/*.png"],
      // The manifest is a file of its own (client/public), so it is
      // served in development as well and can be read as it is.
      manifest: false,
      workbox: {
        // The app is a single page: any unknown address opens index.html,
        // except /api, which must always reach the server.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
        // Nothing of /api is ever written to the cache (RM: no personal
        // data offline).
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api"),
            handler: "NetworkOnly",
          },
        ],
      },
      // In development the service worker stays off: the end-to-end tests
      // run on the dev server and must never be served an old page.
      devOptions: { enabled: false },
    }),
  ],
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

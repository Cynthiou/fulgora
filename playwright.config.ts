import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    // page.goto("/") opens the Vite dev server.
    baseURL: "http://localhost:3000",
  },
  // Every test runs once per project: once on a phone, once on a computer.
  projects: [
    {
      name: "mobile",
      use: { browserName: "chromium", viewport: { width: 375, height: 812 } },
    },
    {
      name: "desktop",
      use: { browserName: "chromium", viewport: { width: 1280, height: 800 } },
    },
  ],
  // Playwright starts the app itself and waits for port 3000 to answer.
  // Locally, an already running "npm run dev" is reused.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    // The test server writes into the test database and signs tokens with
    // its own secret: the E2E tests depend on no .env value. (.env never
    // overrides a variable that is already set.) The tests sign up and log in
    // many times and browse a lot from one address, so both limits are
    // raised for them.
    env: {
      DB_NAME: "fulgora_test",
      JWT_SECRET: "fulgora-e2e-secret-with-at-least-32-characters",
      ALLOWED_ORIGINS: "http://localhost:3000",
      AUTH_RATE_LIMIT: "1000",
      API_RATE_LIMIT: "100000",
    },
  },
});

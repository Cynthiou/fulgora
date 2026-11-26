import { defineConfig } from "@playwright/test";

// The tests run their own client and server on ports of their own, so a
// dev server already running (3000 / 3310) is never reused nor disturbed.
const CLIENT_PORT = 3100;
const API_PORT = 3410;
export const E2E_ORIGIN = `http://localhost:${CLIENT_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // 30 s is enough for one test alone, not always when the whole suite
  // runs at once on this machine: a long path (program, session, history)
  // then takes longer than the default and fails for nothing.
  timeout: 60_000,
  use: {
    // page.goto("/") opens the Vite dev server of the tests.
    baseURL: E2E_ORIGIN,
    // The app is written in French for French phones: the browser of the
    // tests speaks French too, so a time field shows 18:30 and not 06:30 PM.
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  },
  // Every test runs once per project: once on a phone, once on a computer.
  projects: [
    {
      name: "mobile",
      // The size of the high fidelity mockups, so a capture and a mockup can
      // be put side by side (390 x 844, an iPhone 14).
      use: { browserName: "chromium", viewport: { width: 390, height: 844 } },
    },
    {
      name: "desktop",
      use: { browserName: "chromium", viewport: { width: 1280, height: 800 } },
    },
  ],
  // Playwright starts the app itself and waits for the client port to answer.
  webServer: {
    command: "npm run dev",
    url: E2E_ORIGIN,
    reuseExistingServer: false,
    // The test server writes into the test database and signs tokens with
    // its own secret: the E2E tests depend on no .env value. (.env never
    // overrides a variable that is already set.) The tests sign up and log in
    // many times and browse a lot from one address, so both limits are
    // raised for them.
    env: {
      CLIENT_PORT: String(CLIENT_PORT),
      APP_PORT: String(API_PORT),
      API_URL: `http://localhost:${API_PORT}`,
      DB_NAME: "fulgora_test",
      JWT_SECRET: "fulgora-e2e-secret-with-at-least-32-characters",
      ALLOWED_ORIGINS: E2E_ORIGIN,
      AUTH_RATE_LIMIT: "1000",
      API_RATE_LIMIT: "100000",
    },
  },
});

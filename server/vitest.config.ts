import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Server code runs in Node, so tests do too (no fake browser).
    environment: "node",
    // Runs before every test file: loads .env and forces the test database.
    setupFiles: ["./src/test-setup.ts"],
  },
});

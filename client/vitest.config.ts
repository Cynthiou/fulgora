import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Same React plugin as vite.config.ts, so JSX works in tests.
  plugins: [react()],
  test: {
    // jsdom gives tests a fake browser (document, elements) without a screen.
    environment: "jsdom",
    // Every test lives in tests/, which mirrors the folders of src/.
    include: ["tests/**/*.test.{ts,tsx}"],
    // Runs before every test file: cleans the DOM between tests.
    setupFiles: ["./tests/setup.ts"],
  },
});

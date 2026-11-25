import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Server code runs in Node, so tests do too (no fake browser).
    environment: "node",
    // Every test lives in tests/, which mirrors the folders of src/.
    include: ["tests/**/*.test.ts"],
    // Runs before every test file: loads .env and forces the test database.
    setupFiles: ["./tests/setup.ts"],
    // The test files share one MySQL database. Run in parallel, their inserts
    // and clean-up deletes sometimes deadlock each other (ER_LOCK_DEADLOCK):
    // one file at a time keeps the run reliable for a few extra seconds.
    fileParallelism: false,
  },
});

// Runs before every client test file.
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmounts what each test rendered, so tests never see each other's DOM.
// Testing Library only does this by itself when Vitest globals are enabled.
afterEach(() => {
  cleanup();
});

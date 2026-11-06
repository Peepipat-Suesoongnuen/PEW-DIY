import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest runs with `globals: false`, so Testing Library's automatic cleanup
// does not register itself — register it explicitly to avoid cross-test DOM
// accumulation.
afterEach(() => {
  cleanup();
});

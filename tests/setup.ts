import { afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";

// Mock environment variables
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test";
process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret";
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "test-api-key";

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});

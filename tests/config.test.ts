import { describe, expect, test, vi } from "vitest";

describe("config", () => {
  test("fails fast when APP_ENCRYPTION_KEY is invalid", async () => {
    vi.resetModules();
    process.env.APP_ENCRYPTION_KEY = "replace-with-32-byte-base64-key";

    const { loadConfig } = await import("../src/config.js");

    expect(() => loadConfig()).toThrow("APP_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  });
});

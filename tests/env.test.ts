import { afterEach, describe, expect, test, vi } from "vitest";

const ORIGINAL_ENV = process.env;

function applyEnv(overrides: Record<string, string | undefined>) {
  process.env = {
    ...ORIGINAL_ENV,
    ...overrides,
  };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
    }
  }
}

async function importEnvModule() {
  vi.resetModules();
  return await import("../src/lib/server/env");
}

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.restoreAllMocks();
});

describe("env policy", () => {
  test("rejects placeholder secrets in production runtime", async () => {
    applyEnv({
      NODE_ENV: "production",
      NEXT_PHASE: undefined,
      npm_lifecycle_event: "start",
      DATABASE_URL: "postgresql://placeholder:placeholder@placeholder:5432/placeholder",
      APP_ENCRYPTION_KEY: "placeholderEncryptionKey12345678901234567890",
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD: "placeholder",
      SESSION_SECRET: "placeholderSecret123",
      SYNC_POLL_INTERVAL_MS: "60000",
      EVENTS_POLL_INTERVAL_MS: "3000",
    });

    await expect(importEnvModule()).rejects.toThrow(/placeholder|production/i);
  });

  test("allows placeholder secrets in non-production", async () => {
    applyEnv({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://placeholder:placeholder@placeholder:5432/placeholder",
      APP_ENCRYPTION_KEY: "placeholderEncryptionKey12345678901234567890",
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD: "placeholder",
      SESSION_SECRET: "placeholderSecret123",
      SYNC_POLL_INTERVAL_MS: "60000",
      EVENTS_POLL_INTERVAL_MS: "3000",
    });

    const module = await importEnvModule();
    expect(module.env.ADMIN_PASSWORD).toBe("placeholder");
  });
});

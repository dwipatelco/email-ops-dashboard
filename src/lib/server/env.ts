import "dotenv/config";

import { z } from "zod";

const DEV_DEFAULTS = {
  DATABASE_URL: "postgresql://placeholder:placeholder@placeholder:5432/placeholder",
  APP_ENCRYPTION_KEY: "placeholderEncryptionKey12345678901234567890",
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD: "placeholder",
  SESSION_SECRET: "placeholderSecret123",
  SYNC_POLL_INTERVAL_MS: 60000,
  EVENTS_POLL_INTERVAL_MS: 3000,
  SYNC_JOB_STALE_TIMEOUT_MS: 600000,
  IMAP_COMMAND_TIMEOUT_MS: 120000
} as const;

const isBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build";
const enforceProductionSecrets = process.env.NODE_ENV === "production" && !isBuildPhase;

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).default(DEV_DEFAULTS.DATABASE_URL),
  APP_ENCRYPTION_KEY: z.string().min(10).default(DEV_DEFAULTS.APP_ENCRYPTION_KEY),
  ADMIN_USERNAME: z.string().min(1).default(DEV_DEFAULTS.ADMIN_USERNAME),
  ADMIN_PASSWORD: z.string().min(1).default(DEV_DEFAULTS.ADMIN_PASSWORD),
  SESSION_SECRET: z.string().min(12).default(DEV_DEFAULTS.SESSION_SECRET),
  SYNC_POLL_INTERVAL_MS: z.coerce.number().int().min(5000).default(DEV_DEFAULTS.SYNC_POLL_INTERVAL_MS),
  EVENTS_POLL_INTERVAL_MS: z.coerce.number().int().min(1000).default(DEV_DEFAULTS.EVENTS_POLL_INTERVAL_MS),
  SYNC_JOB_STALE_TIMEOUT_MS: z.coerce.number().int().min(60000).default(DEV_DEFAULTS.SYNC_JOB_STALE_TIMEOUT_MS),
  IMAP_COMMAND_TIMEOUT_MS: z.coerce.number().int().min(5000).default(DEV_DEFAULTS.IMAP_COMMAND_TIMEOUT_MS)
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

if (enforceProductionSecrets) {
  const placeholderKeys: string[] = [];

  if (parsed.data.APP_ENCRYPTION_KEY === DEV_DEFAULTS.APP_ENCRYPTION_KEY) {
    placeholderKeys.push("APP_ENCRYPTION_KEY");
  }

  if (parsed.data.ADMIN_PASSWORD === DEV_DEFAULTS.ADMIN_PASSWORD) {
    placeholderKeys.push("ADMIN_PASSWORD");
  }

  if (parsed.data.SESSION_SECRET === DEV_DEFAULTS.SESSION_SECRET) {
    placeholderKeys.push("SESSION_SECRET");
  }

  if (placeholderKeys.length > 0) {
    throw new Error(
      `Invalid production environment configuration: secret placeholders are not allowed (${placeholderKeys.join(", ")})`
    );
  }
}

export const env = parsed.data;

import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).default("postgresql://placeholder:placeholder@placeholder:5432/placeholder"),
  APP_ENCRYPTION_KEY: z.string().min(10).default("placeholderEncryptionKey12345678901234567890"),
  ADMIN_USERNAME: z.string().min(1).default("admin"),
  ADMIN_PASSWORD: z.string().min(1).default("placeholder"),
  SESSION_SECRET: z.string().min(12).default("placeholderSecret123"),
  SYNC_POLL_INTERVAL_MS: z.string().default("60000"),
  EVENTS_POLL_INTERVAL_MS: z.string().default("3000")
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const env = {
  ...parsed.data,
  SYNC_POLL_INTERVAL_MS: Number(parsed.data.SYNC_POLL_INTERVAL_MS),
  EVENTS_POLL_INTERVAL_MS: Number(parsed.data.EVENTS_POLL_INTERVAL_MS)
};

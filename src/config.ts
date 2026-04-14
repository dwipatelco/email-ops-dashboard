import { randomBytes } from "node:crypto";
import { join } from "node:path";

import { validateEncryptionKey } from "./crypto.js";

export type AppConfig = {
  port: number;
  databasePath: string;
  sessionSecret: string;
  adminUsername: string;
  adminPassword: string;
  encryptionKey: string;
  pollIntervalMs: number;
};

export function loadConfig(): AppConfig {
  const encryptionKey = process.env.APP_ENCRYPTION_KEY ?? randomBytes(32).toString("base64");
  validateEncryptionKey(encryptionKey);

  return {
    port: Number(process.env.PORT ?? "3000"),
    databasePath: process.env.DATABASE_PATH ?? join(process.cwd(), "data", "monitor-email.sqlite"),
    sessionSecret: process.env.SESSION_SECRET ?? "change-me",
    adminUsername: process.env.ADMIN_USERNAME ?? "admin",
    adminPassword: process.env.ADMIN_PASSWORD ?? "password",
    encryptionKey,
    pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? "60000")
  };
}

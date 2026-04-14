import { loadEnvFile } from "node:process";

import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { Database } from "./db.js";
import { SyncService } from "./services/sync-service.js";

try {
  loadEnvFile();
} catch (error) {
  if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
    throw error;
  }
}

const config = loadConfig();
const db = new Database(config.databasePath);
const syncService = new SyncService(db, {
  encryptionKey: config.encryptionKey
});
const app = buildApp({
  db,
  sessionSecret: config.sessionSecret,
  adminUsername: config.adminUsername,
  adminPassword: config.adminPassword,
  encryptionKey: config.encryptionKey,
  pollIntervalMs: config.pollIntervalMs,
  syncService
});

setInterval(() => {
  syncService.syncAllMailboxes().catch((error) => {
    console.error("Scheduled sync failed", error);
  });
}, config.pollIntervalMs);

app.listen(config.port, () => {
  console.log(`Mail monitor listening on http://localhost:${config.port}`);
});

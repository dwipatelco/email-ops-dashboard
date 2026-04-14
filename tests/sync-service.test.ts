import { describe, expect, test } from "vitest";

import { Database } from "../src/db.js";
import { SyncService } from "../src/services/sync-service.js";

describe("sync service", () => {
  test("stores inbox and sent mail once and classifies directions", async () => {
    const db = new Database(":memory:");
    const mailboxId = db.mailboxes.create({
      email: "ops@example.com",
      host: "mail.example.com",
      port: 993,
      secure: true,
      username: "ops@example.com",
      password: "encrypted"
    });

    const service = new SyncService(db, {
      createClient: async () => ({
        async listMessages(folder, afterUid) {
          if (folder === "Inbox" && afterUid === 0) {
            return [
              {
                uid: 1,
                messageId: "<inbox-1@example.com>",
                subject: "Inbound",
                sentAt: "2026-04-14T01:00:00.000Z",
                snippet: "hello inbox",
                bodyText: "hello inbox",
                bodyHtml: null,
                from: [{ name: "Alice", address: "alice@example.com" }],
                to: [{ name: "Ops", address: "ops@example.com" }],
                cc: [],
                bcc: []
              }
            ];
          }

          if (folder === "Sent" && afterUid === 0) {
            return [
              {
                uid: 1,
                messageId: "<sent-1@example.com>",
                subject: "Outbound",
                sentAt: "2026-04-14T02:00:00.000Z",
                snippet: "hello sent",
                bodyText: "hello sent",
                bodyHtml: null,
                from: [{ name: "Ops", address: "ops@example.com" }],
                to: [{ name: "Bob", address: "bob@example.com" }],
                cc: [],
                bcc: []
              }
            ];
          }

          return [];
        },
        async close() {}
      })
    });

    await service.syncMailbox(mailboxId);
    await service.syncMailbox(mailboxId);

    const messages = db.messages.list({});

    expect(messages).toHaveLength(2);
    expect(messages.map((message) => message.direction).sort()).toEqual(["incoming", "outgoing"]);
    expect(db.syncCursors.get(mailboxId, "Inbox")?.lastUid).toBe(1);
    expect(db.syncCursors.get(mailboxId, "Sent")?.lastUid).toBe(1);
  });

  test("records sync errors without advancing cursor", async () => {
    const db = new Database(":memory:");
    const mailboxId = db.mailboxes.create({
      email: "ops@example.com",
      host: "mail.example.com",
      port: 993,
      secure: true,
      username: "ops@example.com",
      password: "encrypted"
    });

    const service = new SyncService(db, {
      createClient: async () => ({
        async listMessages() {
          throw new Error("bad credentials");
        },
        async close() {}
      })
    });

    await expect(service.syncMailbox(mailboxId)).rejects.toThrow("bad credentials");

    expect(db.syncCursors.get(mailboxId, "Inbox")).toBeNull();
    expect(db.mailboxes.getById(mailboxId)?.status).toBe("error");
  });
});

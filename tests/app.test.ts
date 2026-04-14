import { describe, expect, test } from "vitest";
import request from "supertest";

import { buildApp } from "../src/app.js";
import { Database } from "../src/db.js";

describe("app auth and audit flow", () => {
  test("redirects unauthenticated requests to login", async () => {
    const db = new Database(":memory:");
    const app = buildApp({
      db,
      sessionSecret: "secret",
      adminUsername: "admin",
      adminPassword: "password",
      encryptionKey: Buffer.alloc(32, 5).toString("base64"),
      pollIntervalMs: 60_000
    });

    const response = await request(app).get("/");

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/login");
  });

  test("logs message detail views in the audit trail", async () => {
    const db = new Database(":memory:");
    const mailboxId = db.mailboxes.create({
      email: "ops@example.com",
      host: "mail.example.com",
      port: 993,
      secure: true,
      username: "ops@example.com",
      password: "encrypted"
    });
    const messageId = db.messages.upsert({
      mailboxId,
      folderName: "Inbox",
      externalUid: 1,
      messageId: "<1@example.com>",
      direction: "incoming",
      from: JSON.stringify([{ name: "Alice", address: "alice@example.com" }]),
      to: JSON.stringify([{ name: "Ops", address: "ops@example.com" }]),
      cc: JSON.stringify([]),
      bcc: JSON.stringify([]),
      subject: "Hello",
      sentAt: "2026-04-14T00:00:00.000Z",
      receivedAt: "2026-04-14T00:00:00.000Z",
      snippet: "hello",
      bodyText: "hello body",
      bodyHtml: null
    });
    const app = buildApp({
      db,
      sessionSecret: "secret",
      adminUsername: "admin",
      adminPassword: "password",
      encryptionKey: Buffer.alloc(32, 5).toString("base64"),
      pollIntervalMs: 60_000
    });

    const agent = request.agent(app);
    await agent
      .post("/login")
      .type("form")
      .send({ username: "admin", password: "password" });

    const response = await agent.get(`/messages/${messageId}`);

    expect(response.status).toBe(200);
    expect(db.auditLogs.list()).toHaveLength(1);
    expect(db.auditLogs.list()[0]?.action).toBe("view_message");
  });
});

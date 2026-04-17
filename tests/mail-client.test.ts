import { beforeEach, describe, expect, test, vi } from "vitest";

const connect = vi.fn(async () => undefined);
const mailboxOpen = vi.fn(async () => ({ uidNext: 123 }));
const fetch = vi.fn(() => ({
  async *[Symbol.asyncIterator]() {
    return;
  },
}));
const logout = vi.fn(async () => undefined);
const on = vi.fn();

vi.mock("imapflow", () => ({
  ImapFlow: class MockImapFlow {
    connect = connect;
    mailboxOpen = mailboxOpen;
    fetch = fetch;
    logout = logout;
    on = on;
  },
}));

describe("createImapClient", () => {
  beforeEach(() => {
    connect.mockClear();
    mailboxOpen.mockClear();
    fetch.mockClear();
    logout.mockClear();
    on.mockClear();
  });

  test("fetches mailbox batches by UID instead of sequence number", async () => {
    const { createImapClient } = await import("../src/lib/server/mail");

    const client = await createImapClient({
      host: "mail.example.com",
      port: 993,
      secure: true,
      username: "tester",
      password: "secret",
      commandTimeoutMs: 120000,
    });

    await client.listMessages("Sent", 120, 5);

    expect(fetch).toHaveBeenCalledWith(
      "121:122",
      {
        uid: true,
        source: true,
        internalDate: true,
      },
      {
        uid: true,
      },
    );
  });
});

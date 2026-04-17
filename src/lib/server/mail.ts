import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export type MailContact = {
  name: string | null;
  address: string;
};

export type SyncMessage = {
  uid: number;
  messageId: string | null;
  subject: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  snippet: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  from: MailContact[];
  to: MailContact[];
  cc: MailContact[];
  bcc: MailContact[];
};

function mapAddresses(value: { value?: Array<{ name?: string; address?: string }> } | undefined): MailContact[] {
  return (value?.value ?? [])
    .map((entry) => ({
      name: entry.name ?? null,
      address: entry.address ?? ""
    }))
    .filter((entry) => entry.address);
}

function toIsoString(value: string | Date | undefined): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}

function createSnippet(bodyText: string | null): string | null {
  if (!bodyText) {
    return null;
  }

  return bodyText.replace(/\s+/g, " ").trim().slice(0, 180);
}

export type ImapMailboxClient = {
  listMessages: (folderName: string, afterUid: number) => Promise<SyncMessage[]>;
  close: () => Promise<void>;
};

export async function createImapClient(options: {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  commandTimeoutMs: number;
}): Promise<ImapMailboxClient> {
  const client = new ImapFlow({
    host: options.host,
    port: options.port,
    secure: options.secure,
    auth: {
      user: options.username,
      pass: options.password
    },
    socketTimeout: options.commandTimeoutMs,
    logger: false
  });

  let connectionError: Error | null = null;
  client.on("error", (error) => {
    connectionError = error instanceof Error ? error : new Error(String(error));
    console.error("IMAP connection error", {
      message: connectionError.message,
      code: (error as { code?: unknown })?.code,
      host: options.host,
      username: options.username,
    });
  });

  await client.connect();

  return {
    async listMessages(folderName, afterUid) {
      if (connectionError) {
        throw connectionError;
      }

      const mailbox = await client.mailboxOpen(folderName, { readOnly: true });
      const uidNext = mailbox.uidNext ?? 1;

      // Some IMAP servers reject UID FETCH ranges that start above the current UID window.
      if (afterUid + 1 >= uidNext) {
        return [];
      }

      const messages: SyncMessage[] = [];
      const range = `${Math.max(afterUid + 1, 1)}:*`;

      for await (const rawMessage of client.fetch(range, { uid: true, source: true, internalDate: true })) {
        const parsed = await simpleParser(rawMessage.source);
        const bodyHtml = typeof parsed.html === "string" ? parsed.html : null;
        const bodyText = parsed.text ?? null;

        messages.push({
          uid: rawMessage.uid,
          messageId: parsed.messageId ?? null,
          subject: parsed.subject ?? null,
          sentAt: toIsoString(parsed.date ?? undefined),
          receivedAt: toIsoString(rawMessage.internalDate),
          snippet: createSnippet(bodyText),
          bodyText,
          bodyHtml,
          from: mapAddresses(parsed.from),
          to: mapAddresses(parsed.to),
          cc: mapAddresses(parsed.cc),
          bcc: mapAddresses(parsed.bcc)
        });
      }

      return messages;
    },
    async close() {
      if (connectionError) {
        return;
      }

      await client.logout();
    }
  };
}

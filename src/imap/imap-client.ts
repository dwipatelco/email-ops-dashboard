import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

import type { MailContact, SyncMessage } from "../types.js";

type ImapConnectionOptions = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
};

export type ImapMailboxClient = {
  listMessages: (folderName: string, afterUid: number) => Promise<SyncMessage[]>;
  close: () => Promise<void>;
};

function normalizeContacts(contacts: MailContact[]): MailContact[] {
  return contacts.filter((contact) => contact.address);
}

function mapAddresses(value: { value?: Array<{ name?: string; address?: string }> } | undefined): MailContact[] {
  return normalizeContacts(
    (value?.value ?? []).map((entry) => ({
      name: entry.name ?? null,
      address: entry.address ?? ""
    }))
  );
}

function createSnippet(bodyText: string | null): string | null {
  if (!bodyText) {
    return null;
  }

  return bodyText.replace(/\s+/g, " ").trim().slice(0, 180);
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

export async function createImapClient(options: ImapConnectionOptions): Promise<ImapMailboxClient> {
  const client = new ImapFlow({
    host: options.host,
    port: options.port,
    secure: options.secure,
    auth: {
      user: options.username,
      pass: options.password
    },
    logger: false
  });

  await client.connect();

  return {
    async listMessages(folderName, afterUid) {
      await client.mailboxOpen(folderName, { readOnly: true });

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
      await client.logout();
    }
  };
}

import { ImapFlow } from "imapflow";
import { MailParser } from "mailparser";

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
  attachments: SyncAttachment[];
};

export type SyncAttachment = {
  filename: string;
  contentType: string | null;
  contentDisposition: string | null;
  contentId: string | null;
  partId: string | null;
  size: number | null;
  isInline: boolean;
};

export type ImapMessageBatch = {
  messages: SyncMessage[];
  hasMore: boolean;
  nextCursorUid: number;
};

type ParsedMessageSource = Omit<SyncMessage, "uid" | "receivedAt">;

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

function logMailEvent(event: string, details: Record<string, unknown>) {
  console.info("[imap]", {
    event,
    at: new Date().toISOString(),
    ...details
  });
}

function normalizeAttachmentFilename(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "Unnamed attachment";
}

function normalizeContentId(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  return value.trim().replace(/^<|>$/g, "");
}

export function normalizeParsedAttachments(
  attachments: Array<{
    filename?: unknown;
    contentType?: unknown;
    contentDisposition?: unknown;
    cid?: unknown;
    size?: unknown;
    partId?: unknown;
    related?: unknown;
  }>,
): SyncAttachment[] {
  return attachments.map((attachment) => {
    const contentDisposition =
      typeof attachment.contentDisposition === "string" && attachment.contentDisposition.trim()
        ? attachment.contentDisposition.trim().toLowerCase()
        : null;
    const contentType =
      typeof attachment.contentType === "string" && attachment.contentType.trim()
        ? attachment.contentType.trim().toLowerCase()
        : null;
    const contentId = normalizeContentId(attachment.cid);
    const isInline =
      contentDisposition === "inline" ||
      attachment.related === true ||
      (contentType?.startsWith("image/") === true && Boolean(contentId));

    return {
      filename: normalizeAttachmentFilename(attachment.filename),
      contentType,
      contentDisposition,
      contentId,
      partId: typeof attachment.partId === "string" && attachment.partId.trim() ? attachment.partId.trim() : null,
      size: typeof attachment.size === "number" && Number.isFinite(attachment.size) ? attachment.size : null,
      isInline,
    };
  });
}

export async function parseMessageSource(source: Buffer): Promise<ParsedMessageSource> {
  return await new Promise((resolve, reject) => {
    const parser = new MailParser();
    let headers:
      | {
          get: (key: string) => unknown;
        }
      | null = null;
    let bodyHtml: string | null = null;
    let bodyText: string | null = null;
    const attachments: SyncAttachment[] = [];

    parser.on("headers", (value: { get: (key: string) => unknown }) => {
      headers = value;
    });

    parser.on("data", (data: any) => {
      if (data.type === "text") {
        bodyHtml = typeof data.html === "string" ? data.html : null;
        bodyText = typeof data.text === "string" ? data.text : null;
        return;
      }

      if (data.type === "attachment") {
        attachments.push(
          ...normalizeParsedAttachments([
            {
              filename: data.filename,
              contentType: data.contentType,
              contentDisposition: data.contentDisposition,
              cid: data.cid,
              size: data.size,
              partId: data.partId,
              related: data.related,
            },
          ]),
        );
        if (typeof data.release === "function") {
          data.release();
        }
      }
    });

    parser.once("error", reject);
    parser.once("end", () => {
      const getHeader = (key: string) => headers?.get(key);

      resolve({
        messageId: (getHeader("message-id") as string | undefined) ?? null,
        subject: (getHeader("subject") as string | undefined) ?? null,
        sentAt: toIsoString(getHeader("date") as string | Date | undefined),
        snippet: createSnippet(bodyText),
        bodyText,
        bodyHtml,
        from: mapAddresses(getHeader("from") as { value?: Array<{ name?: string; address?: string }> } | undefined),
        to: mapAddresses(getHeader("to") as { value?: Array<{ name?: string; address?: string }> } | undefined),
        cc: mapAddresses(getHeader("cc") as { value?: Array<{ name?: string; address?: string }> } | undefined),
        bcc: mapAddresses(getHeader("bcc") as { value?: Array<{ name?: string; address?: string }> } | undefined),
        attachments,
      });
    });

    parser.end(source);
  });
}

export type ImapMailboxClient = {
  listMessages: (folderName: string, afterUid: number, limit: number) => Promise<ImapMessageBatch>;
  close: () => Promise<void>;
};

export function getImapFetchBatchRange(afterUid: number, uidNext: number, limit: number) {
  const startUid = Math.max(afterUid + 1, 1);
  const highestUid = uidNext - 1;

  if (startUid > highestUid) {
    return null;
  }

  const endUid = Math.min(startUid + limit - 1, highestUid);

  return {
    range: `${startUid}:${endUid}`,
    hasMore: endUid < highestUid,
    nextCursorUid: endUid,
  };
}

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
    async listMessages(folderName, afterUid, limit) {
      if (connectionError) {
        throw connectionError;
      }

      const openStartedAt = Date.now();
      logMailEvent("mailbox-open-start", {
        folder: folderName,
        afterUid,
        limit
      });
      const mailbox = await client.mailboxOpen(folderName, { readOnly: true });
      logMailEvent("mailbox-open-complete", {
        folder: folderName,
        afterUid,
        limit,
        uidNext: mailbox.uidNext ?? 1,
        durationMs: Date.now() - openStartedAt
      });
      const uidNext = mailbox.uidNext ?? 1;
      const batch = getImapFetchBatchRange(afterUid, uidNext, limit);
      if (!batch) {
        return {
          messages: [],
          hasMore: false,
          nextCursorUid: afterUid,
        };
      }

      const messages: SyncMessage[] = [];
      const fetchStartedAt = Date.now();
      logMailEvent("fetch-range-start", {
        folder: folderName,
        range: batch.range,
        afterUid,
        limit
      });
      let seen = 0;

      for await (const rawMessage of client.fetch(
        batch.range,
        { uid: true, source: true, internalDate: true },
        { uid: true },
      )) {
        if (!rawMessage.source) {
          continue;
        }

        seen += 1;
        if (seen === 1 || seen % 10 === 0) {
          logMailEvent("fetch-range-progress", {
            folder: folderName,
            range: batch.range,
            seen,
            uid: rawMessage.uid
          });
        }

        const parsed = await parseMessageSource(rawMessage.source);

        messages.push({
          uid: rawMessage.uid,
          messageId: parsed.messageId,
          subject: parsed.subject,
          sentAt: parsed.sentAt,
          receivedAt: toIsoString(rawMessage.internalDate),
          snippet: parsed.snippet,
          bodyText: parsed.bodyText,
          bodyHtml: parsed.bodyHtml,
          from: parsed.from,
          to: parsed.to,
          cc: parsed.cc,
          bcc: parsed.bcc,
          attachments: parsed.attachments,
        });
      }

      logMailEvent("fetch-range-complete", {
        folder: folderName,
        range: batch.range,
        fetched: messages.length,
        hasMore: batch.hasMore,
        nextCursorUid: batch.nextCursorUid,
        durationMs: Date.now() - fetchStartedAt
      });

      return {
        messages,
        hasMore: batch.hasMore,
        nextCursorUid: batch.nextCursorUid,
      };
    },
    async close() {
      if (connectionError) {
        return;
      }

      await client.logout();
    }
  };
}

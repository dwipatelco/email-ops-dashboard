import { decryptSecret } from "../crypto.js";
import type { Database } from "../db.js";
import { createImapClient, type ImapMailboxClient } from "../imap/imap-client.js";
import type { MailboxRecord, SyncMessage } from "../types.js";

type SyncClientFactory = (params: {
  mailbox: MailboxRecord;
  decryptedPassword: string;
}) => Promise<ImapMailboxClient>;

type SyncServiceOptions = {
  encryptionKey?: string;
  createClient?: SyncClientFactory;
};

type FolderPlan = {
  folderName: string;
  direction: "incoming" | "outgoing";
};

const FOLDERS: FolderPlan[] = [
  { folderName: "Inbox", direction: "incoming" },
  { folderName: "Sent", direction: "outgoing" }
];

function stringify(value: SyncMessage["from"]): string {
  return JSON.stringify(value);
}

export class SyncService {
  constructor(
    private readonly db: Database,
    private readonly options: SyncServiceOptions = {}
  ) {}

  async syncAllMailboxes(): Promise<void> {
    const mailboxes = this.db.mailboxes.list();
    for (const mailbox of mailboxes) {
      await this.syncMailbox(mailbox.id);
    }
  }

  async syncMailbox(mailboxId: number): Promise<void> {
    const mailbox = this.db.mailboxes.getById(mailboxId);
    if (!mailbox) {
      throw new Error(`Mailbox ${mailboxId} not found`);
    }

    const runId = this.db.syncRuns.start(mailboxId);
    this.db.mailboxes.setSyncState(mailboxId, {
      status: "syncing",
      lastSyncStartedAt: new Date().toISOString(),
      lastSyncError: null
    });

    const decryptedPassword = this.options.encryptionKey
      ? decryptSecret(mailbox.encryptedPassword, this.options.encryptionKey)
      : mailbox.encryptedPassword;

    const createClient = this.options.createClient ?? (async ({ mailbox: item, decryptedPassword: password }) =>
      createImapClient({
        host: item.host,
        port: item.port,
        secure: item.secure,
        username: item.username,
        password
      }));

    let client: ImapMailboxClient | null = null;
    let incomingCount = 0;
    let outgoingCount = 0;

    try {
      client = await createClient({ mailbox, decryptedPassword });

      for (const folder of FOLDERS) {
        const syncedCount = await this.syncFolder(mailbox.id, folder, client);
        if (folder.direction === "incoming") {
          incomingCount += syncedCount;
        } else {
          outgoingCount += syncedCount;
        }
      }

      this.db.syncRuns.finishSuccess(runId, incomingCount, outgoingCount);
      this.db.mailboxes.setSyncState(mailboxId, {
        status: "ok",
        lastSyncFinishedAt: new Date().toISOString(),
        lastSyncError: null
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sync error";
      this.db.syncRuns.finishFailure(runId, message);
      this.db.mailboxes.setSyncState(mailboxId, {
        status: "error",
        lastSyncFinishedAt: new Date().toISOString(),
        lastSyncError: message
      });
      throw error;
    } finally {
      if (client) {
        await client.close();
      }
    }
  }

  private async syncFolder(
    mailboxId: number,
    folder: FolderPlan,
    client: ImapMailboxClient
  ): Promise<number> {
    const cursor = this.db.syncCursors.get(mailboxId, folder.folderName);
    const lastSeenUid = cursor?.lastUid ?? 0;
    const messages = await client.listMessages(folder.folderName, lastSeenUid);

    let maxUid = lastSeenUid;
    for (const message of messages) {
      maxUid = Math.max(maxUid, message.uid);
      this.db.messages.upsert({
        mailboxId,
        folderName: folder.folderName,
        externalUid: message.uid,
        messageId: message.messageId,
        direction: folder.direction,
        from: stringify(message.from),
        to: stringify(message.to),
        cc: stringify(message.cc),
        bcc: stringify(message.bcc),
        subject: message.subject,
        sentAt: message.sentAt,
        receivedAt: message.receivedAt ?? message.sentAt,
        snippet: message.snippet,
        bodyText: message.bodyText,
        bodyHtml: message.bodyHtml
      });
    }

    if (maxUid > lastSeenUid) {
      this.db.syncCursors.upsert(mailboxId, folder.folderName, maxUid);
    }

    return messages.length;
  }
}

import { MailDirection, Prisma, SyncJobStatus, SyncRunStatus } from "../../generated/prisma/client";

import { decryptSecret } from "./crypto";
import { env } from "./env";
import { createImapClient, type ImapMailboxClient } from "./mail";
import { prisma } from "@/lib/db/prisma";

type FolderPlan = {
  folderName: string;
  direction: MailDirection;
};

const FOLDERS: FolderPlan[] = [
  { folderName: "Inbox", direction: "incoming" },
  { folderName: "Sent", direction: "outgoing" }
];

type ClaimedSyncJob = {
  id: string;
  mailboxId: string;
};

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toErrorDetail(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function formatSyncError(error: unknown, context?: string): string {
  const message = error instanceof Error ? error.message : "Unknown sync failure";
  const details: string[] = [];

  if (error && typeof error === "object") {
    const source = error as Record<string, unknown>;
    const command = toErrorDetail(source.command);
    const code = toErrorDetail(source.code);
    const responseStatus = toErrorDetail(source.responseStatus);
    const responseCode = toErrorDetail(source.serverResponseCode);
    const responseText = toErrorDetail(source.responseText);

    if (command) {
      details.push(`command=${command}`);
    }
    if (code) {
      details.push(`code=${code}`);
    }
    if (responseStatus) {
      details.push(`imapStatus=${responseStatus}`);
    }
    if (responseCode) {
      details.push(`serverCode=${responseCode}`);
    }
    if (responseText) {
      details.push(`response=${responseText}`);
    }
  }

  const prefix = context ? `${context}: ` : "";
  if (details.length === 0) {
    return `${prefix}${message}`;
  }

  return `${prefix}${message} (${details.join(", ")})`;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

export async function queueMailboxSync(mailboxId: string, reason: string) {
  try {
    return await prisma.syncJob.create({
      data: {
        mailboxId,
        reason,
        status: "queued"
      }
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return null;
    }

    throw error;
  }
}

export async function claimNextQueuedSyncJob(): Promise<ClaimedSyncJob | null> {
  const claimed = await prisma.$queryRaw<ClaimedSyncJob[]>`
    WITH claim AS (
      SELECT id
      FROM "SyncJob"
      WHERE status = 'queued'::"SyncJobStatus"
      ORDER BY "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "SyncJob"
    SET status = 'running'::"SyncJobStatus", "startedAt" = NOW()
    WHERE id = (SELECT id FROM claim)
    RETURNING id, "mailboxId";
  `;

  return claimed[0] ?? null;
}

export async function processSyncQueue(options?: { createClient?: typeof createImapClient }) {
  const createClient = options?.createClient ?? createImapClient;

  const job = await claimNextQueuedSyncJob();

  if (!job) {
    return false;
  }

  try {
    await syncMailbox(job.mailboxId, createClient);
    await prisma.syncJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        finishedAt: new Date()
      }
    });
  } catch (error) {
    const message = formatSyncError(error, "Sync queue job failed");
    await prisma.syncJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        error: message
      }
    });
  }

  return true;
}

export async function syncMailbox(
  mailboxId: string,
  createClient: typeof createImapClient = createImapClient
): Promise<void> {
  const mailbox = await prisma.mailbox.findUnique({ where: { id: mailboxId } });
  if (!mailbox) {
    throw new Error(`Mailbox ${mailboxId} not found`);
  }

  const run = await prisma.syncRun.create({
    data: {
      mailboxId,
      status: SyncRunStatus.running
    }
  });

  await prisma.mailbox.update({
    where: { id: mailboxId },
    data: {
      status: "syncing",
      lastSyncStartedAt: new Date(),
      lastSyncError: null
    }
  });

  let client: ImapMailboxClient | null = null;

  try {
    let password: string;
    try {
      password = decryptSecret(mailbox.encryptedPassword, env.APP_ENCRYPTION_KEY);
    } catch {
      throw new Error(
        "Unable to decrypt mailbox password. Check APP_ENCRYPTION_KEY consistency across web and worker, then re-save mailbox credentials."
      );
    }

    client = await createClient({
      host: mailbox.host,
      port: mailbox.port,
      secure: mailbox.secure,
      username: mailbox.username,
      password
    });

    let incomingCount = 0;
    let outgoingCount = 0;

    for (const folder of FOLDERS) {
      const count = await syncFolder(mailboxId, folder, client);
      if (folder.direction === "incoming") {
        incomingCount += count;
      } else {
        outgoingCount += count;
      }
    }

    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status: SyncRunStatus.ok,
        finishedAt: new Date(),
        incomingCount,
        outgoingCount,
        errorMessage: null
      }
    });

    await prisma.mailbox.update({
      where: { id: mailboxId },
      data: {
        status: "ok",
        lastSyncFinishedAt: new Date(),
        lastSyncError: null
      }
    });
  } catch (error) {
    const message = formatSyncError(error, `Mailbox sync failed for ${mailbox.email}`);
    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status: SyncRunStatus.error,
        finishedAt: new Date(),
        errorMessage: message
      }
    });
    await prisma.mailbox.update({
      where: { id: mailboxId },
      data: {
        status: "error",
        lastSyncFinishedAt: new Date(),
        lastSyncError: message
      }
    });
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

async function syncFolder(mailboxId: string, folder: FolderPlan, client: ImapMailboxClient): Promise<number> {
  const cursor = await prisma.syncCursor.findUnique({
    where: {
      mailboxId_folderName: {
        mailboxId,
        folderName: folder.folderName
      }
    }
  });

  const lastUid = cursor?.lastUid ?? 0;
  let messages;
  try {
    messages = await client.listMessages(folder.folderName, lastUid);
  } catch (error) {
    throw new Error(formatSyncError(error, `Folder ${folder.folderName}`));
  }

  let maxUid = lastUid;
  for (const message of messages) {
    maxUid = Math.max(maxUid, message.uid);

    await prisma.message.upsert({
      where: {
        mailboxId_folderName_externalUid: {
          mailboxId,
          folderName: folder.folderName,
          externalUid: message.uid
        }
      },
      update: {
        messageId: message.messageId,
        direction: folder.direction,
        fromJson: toJson(message.from),
        toJson: toJson(message.to),
        ccJson: toJson(message.cc),
        bccJson: toJson(message.bcc),
        subject: message.subject,
        sentAt: message.sentAt ? new Date(message.sentAt) : null,
        receivedAt: message.receivedAt ? new Date(message.receivedAt) : null,
        snippet: message.snippet,
        bodyText: message.bodyText,
        bodyHtml: message.bodyHtml,
        syncedAt: new Date()
      },
      create: {
        mailboxId,
        folderName: folder.folderName,
        externalUid: message.uid,
        messageId: message.messageId,
        direction: folder.direction,
        fromJson: toJson(message.from),
        toJson: toJson(message.to),
        ccJson: toJson(message.cc),
        bccJson: toJson(message.bcc),
        subject: message.subject,
        sentAt: message.sentAt ? new Date(message.sentAt) : null,
        receivedAt: message.receivedAt ? new Date(message.receivedAt) : null,
        snippet: message.snippet,
        bodyText: message.bodyText,
        bodyHtml: message.bodyHtml
      }
    });
  }

  if (maxUid > lastUid) {
    await prisma.syncCursor.upsert({
      where: {
        mailboxId_folderName: {
          mailboxId,
          folderName: folder.folderName
        }
      },
      update: {
        lastUid: maxUid
      },
      create: {
        mailboxId,
        folderName: folder.folderName,
        lastUid: maxUid
      }
    });
  }

  return messages.length;
}

export async function recordWorkerHeartbeat(currentState: string) {
  await prisma.workerHeartbeat.upsert({
    where: { id: "primary" },
    update: {
      currentState,
      lastSeenAt: new Date()
    },
    create: {
      id: "primary",
      currentState,
      lastSeenAt: new Date()
    }
  });
}

export function mapJobStatusToSyncState(status: SyncJobStatus): "queued" | "running" | "done" {
  if (status === "queued") {
    return "queued";
  }

  if (status === "running") {
    return "running";
  }

  return "done";
}

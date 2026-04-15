import { MailDirection, MailboxStatus, Prisma } from "@prisma/client";

import { buildDashboardSummary } from "./dashboard";
import { prisma } from "./prisma";

type MessageFilterInput = {
  mailboxId?: string;
  direction?: MailDirection;
  search?: string;
  fromDate?: string;
  toDate?: string;
};

function toContactString(value: Prisma.JsonValue): string {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .map((entry) => {
      if (typeof entry !== "object" || !entry || !("address" in entry)) {
        return "";
      }

      const address = (entry as { address?: unknown }).address;
      return typeof address === "string" ? address : "";
    })
    .filter(Boolean)
    .join(", ");
}

export async function getDashboardData() {
  const [mailboxes, recentMessages, syncRuns, heartbeat] = await Promise.all([
    prisma.mailbox.findMany({
      orderBy: { email: "asc" },
      select: {
        id: true,
        email: true,
        host: true,
        port: true,
        status: true,
        lastSyncFinishedAt: true,
        lastSyncError: true
      }
    }),
    prisma.message.findMany({
      take: 100,
      orderBy: { syncedAt: "desc" },
      select: {
        direction: true,
        receivedAt: true,
        syncedAt: true
      }
    }),
    prisma.syncRun.findMany({
      take: 20,
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        incomingCount: true,
        outgoingCount: true,
        errorMessage: true
      }
    }),
    prisma.workerHeartbeat.findUnique({ where: { id: "primary" } })
  ]);

  const summary = buildDashboardSummary({
    mailboxes: mailboxes.map((mailbox) => ({
      id: mailbox.id,
      status: mailbox.status,
      lastSyncFinishedAt: mailbox.lastSyncFinishedAt
    })),
    recentMessages: recentMessages.map((message) => ({
      direction: message.direction,
      receivedAt: message.receivedAt,
      syncedAt: message.syncedAt
    })),
    syncRuns: syncRuns.map((run) => ({ status: run.status }))
  });

  return {
    summary,
    recentSyncRuns: syncRuns,
    heartbeat,
    mailboxSnapshots: mailboxes
  };
}

export async function getMailboxes() {
  return await prisma.mailbox.findMany({
    include: {
      syncJobs: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: { email: "asc" }
  });
}

export async function getMailbox(id: string) {
  return await prisma.mailbox.findUnique({ where: { id } });
}

export async function getMessages(filters: MessageFilterInput) {
  const where: Prisma.MessageWhereInput = {};

  if (filters.mailboxId) {
    where.mailboxId = filters.mailboxId;
  }

  if (filters.direction) {
    where.direction = filters.direction;
  }

  if (filters.search) {
    where.OR = [
      { subject: { contains: filters.search, mode: "insensitive" } },
      { bodyText: { contains: filters.search, mode: "insensitive" } }
    ];
  }

  if (filters.fromDate || filters.toDate) {
    where.receivedAt = {};
    if (filters.fromDate) {
      where.receivedAt.gte = new Date(filters.fromDate);
    }
    if (filters.toDate) {
      where.receivedAt.lte = new Date(filters.toDate);
    }
  }

  const [messages, mailboxes] = await Promise.all([
    prisma.message.findMany({
      where,
      select: {
        id: true,
        direction: true,
        subject: true,
        snippet: true,
        receivedAt: true,
        fromJson: true,
        toJson: true,
        mailbox: {
          select: {
            id: true,
            email: true
          }
        }
      },
      orderBy: [{ receivedAt: "desc" }, { syncedAt: "desc" }],
      take: 400
    }),
    prisma.mailbox.findMany({
      orderBy: { email: "asc" },
      select: {
        id: true,
        email: true
      }
    })
  ]);

  return {
    mailboxes,
    messages: messages.map((message) => ({
      ...message,
      fromText: toContactString(message.fromJson),
      toText: toContactString(message.toJson)
    }))
  };
}

export async function getMessageDetail(id: string) {
  return await prisma.message.findUnique({
    where: { id },
    include: { mailbox: true }
  });
}

export async function getSystemStatus() {
  const [heartbeat, jobs, runs] = await Promise.all([
    prisma.workerHeartbeat.findUnique({ where: { id: "primary" } }),
    prisma.syncJob.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        reason: true,
        createdAt: true,
        mailbox: {
          select: {
            email: true
          }
        }
      }
    }),
    prisma.syncRun.findMany({
      take: 30,
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        incomingCount: true,
        outgoingCount: true,
        errorMessage: true,
        mailbox: {
          select: {
            email: true
          }
        }
      }
    })
  ]);

  return { heartbeat, jobs, runs };
}

export async function countEventsVersion() {
  const [jobCount, messageCount, runCount] = await Promise.all([
    prisma.syncJob.count(),
    prisma.message.count(),
    prisma.syncRun.count()
  ]);

  return `${jobCount}-${messageCount}-${runCount}`;
}

export function normalizeMailboxStatus(status: MailboxStatus) {
  if (status === "ok") {
    return "healthy";
  }

  if (status === "error") {
    return "failing";
  }

  if (status === "syncing") {
    return "syncing";
  }

  return "idle";
}

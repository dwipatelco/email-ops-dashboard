import { MailDirection, MailboxStatus, SyncRunStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

type DashboardSummaryInput = {
  mailboxes: Array<{
    id: string;
    status: MailboxStatus;
    lastSyncFinishedAt: Date | null;
  }>;
  recentMessages: Array<{
    direction: MailDirection;
    receivedAt: Date | null;
    syncedAt: Date;
  }>;
  syncRuns: Array<{
    status: SyncRunStatus;
  }>;
};

export function buildDashboardSummary(input: DashboardSummaryInput) {
  const latestActivity = input.recentMessages.reduce<Date | null>((latest, message) => {
    const candidate = message.receivedAt ?? message.syncedAt;
    if (!latest || candidate > latest) {
      return candidate;
    }
    return latest;
  }, null);

  return {
    mailboxCount: input.mailboxes.length,
    healthyMailboxCount: input.mailboxes.filter((mailbox) => mailbox.status === "ok").length,
    failingMailboxCount: input.mailboxes.filter((mailbox) => mailbox.status === "error").length,
    incomingCount: input.recentMessages.filter((message) => message.direction === "incoming").length,
    outgoingCount: input.recentMessages.filter((message) => message.direction === "outgoing").length,
    failedSyncRuns: input.syncRuns.filter((run) => run.status === "error").length,
    latestActivityAt: latestActivity
  };
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

import { prisma } from "@/lib/db/prisma";

export async function getSystemStatus() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    heartbeat,
    jobs,
    runs,
    queuedJobs,
    runningJobs,
    failedJobs24h,
    failedRuns24h,
    mailboxes
  ] = await Promise.all([
    prisma.workerHeartbeat.findUnique({ where: { id: "primary" } }),
    prisma.syncJob.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        reason: true,
        error: true,
        createdAt: true,
        mailbox: {
          select: {
            email: true
          }
        }
      }
    }),
    prisma.syncRun.findMany({
      take: 50,
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
    }),
    prisma.syncJob.count({ where: { status: "queued" } }),
    prisma.syncJob.count({ where: { status: "running" } }),
    prisma.syncJob.count({
      where: { status: "failed", createdAt: { gte: twentyFourHoursAgo } }
    }),
    prisma.syncRun.count({
      where: { status: "error", startedAt: { gte: twentyFourHoursAgo } }
    }),
    prisma.mailbox.findMany({
      select: { id: true, email: true },
      orderBy: { email: "asc" }
    })
  ]);

  return {
    heartbeat,
    jobs,
    runs,
    metrics: {
      queuedJobs,
      runningJobs,
      failedJobs24h,
      failedRuns24h
    },
    mailboxes
  };
}

export async function countEventsVersion() {
  const [jobCount, messageCount, runCount] = await Promise.all([
    prisma.syncJob.count(),
    prisma.message.count(),
    prisma.syncRun.count()
  ]);

  return `${jobCount}-${messageCount}-${runCount}`;
}

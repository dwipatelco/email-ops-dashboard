import { beforeEach, describe, expect, test, vi } from "vitest";

const prisma = {
  $queryRaw: vi.fn(),
  syncJob: {
    create: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  syncRun: {
    updateMany: vi.fn(),
  },
  mailbox: {
    update: vi.fn(),
  },
};

vi.mock("@/lib/db/prisma", () => ({
  prisma,
}));

describe("sync queue", () => {
  beforeEach(() => {
    vi.resetModules();
    prisma.$queryRaw.mockReset();
    prisma.syncJob.create.mockReset();
    prisma.syncJob.createMany.mockReset();
    prisma.syncJob.findMany.mockReset();
    prisma.syncJob.findUnique.mockReset();
    prisma.syncJob.update.mockReset();
    prisma.syncJob.updateMany.mockReset();
    prisma.syncRun.updateMany.mockReset();
    prisma.mailbox.update.mockReset();
  });

  test("claimNextQueuedSyncJob atomically claims one queued job", async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ id: "job-1", mailboxId: "mailbox-1" }]);

    const { claimNextQueuedSyncJob } = await import("../src/lib/server/sync");
    const claimed = await claimNextQueuedSyncJob();

    expect(claimed).toEqual({ id: "job-1", mailboxId: "mailbox-1" });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  test("queueMailboxSync ignores duplicate active-job constraint", async () => {
    prisma.syncJob.create.mockRejectedValueOnce({ code: "P2002" });
    const { queueMailboxSync } = await import("../src/lib/server/sync");

    await expect(queueMailboxSync("mailbox-1", "scheduled")).resolves.toBeNull();
  });

  test("scheduleQueuedSyncJobsForAllMailboxes batches inserts", async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ id: "mailbox-1" }, { id: "mailbox-2" }]);
    prisma.syncJob.createMany.mockResolvedValueOnce({ count: 2 });

    const { scheduleQueuedSyncJobsForAllMailboxes } = await import("../src/lib/server/sync");
    const inserted = await scheduleQueuedSyncJobsForAllMailboxes();

    expect(inserted).toBe(2);
    expect(prisma.syncJob.createMany).toHaveBeenCalledTimes(1);
  });

  test("reapStaleRunningJobs ignores fresh running jobs", async () => {
    prisma.syncJob.findMany.mockResolvedValueOnce([]);

    const { reapStaleRunningJobs } = await import("../src/lib/server/sync");
    const result = await reapStaleRunningJobs(new Date("2026-04-16T00:10:00.000Z"));

    expect(result).toEqual({ reapedCount: 0, retriedCount: 0 });
    expect(prisma.syncJob.updateMany).not.toHaveBeenCalled();
    expect(prisma.syncJob.create).not.toHaveBeenCalled();
  });

  test("reapStaleRunningJobs marks stale running as failed and requeues once", async () => {
    prisma.syncJob.findMany.mockResolvedValueOnce([
      {
        id: "job-running-1",
        mailboxId: "mailbox-1",
        startedAt: new Date("2026-04-16T00:00:00.000Z"),
      },
    ]);
    prisma.syncJob.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.syncRun.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.mailbox.update.mockResolvedValueOnce({});
    prisma.syncJob.create.mockResolvedValueOnce({ id: "job-retry-1" });

    const { reapStaleRunningJobs } = await import("../src/lib/server/sync");
    const result = await reapStaleRunningJobs(new Date("2026-04-16T00:20:00.000Z"));

    expect(result).toEqual({ reapedCount: 1, retriedCount: 1 });
    expect(prisma.syncJob.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.syncRun.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.mailbox.update).toHaveBeenCalledTimes(1);
    expect(prisma.syncJob.create).toHaveBeenCalledWith({
      data: {
        mailboxId: "mailbox-1",
        reason: "retry-stale-timeout",
        status: "queued",
      },
    });
  });

  test("stopRunningSyncJob marks running job failed", async () => {
    prisma.syncJob.findUnique.mockResolvedValueOnce({
      id: "job-running-1",
      mailboxId: "mailbox-1",
      status: "running",
    });
    prisma.syncJob.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.syncRun.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.mailbox.update.mockResolvedValueOnce({});

    const { stopRunningSyncJob } = await import("../src/lib/server/sync");
    const result = await stopRunningSyncJob("job-running-1");

    expect(result).toEqual({ stopped: true, mailboxId: "mailbox-1" });
    expect(prisma.syncJob.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.syncRun.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.mailbox.update).toHaveBeenCalledTimes(1);
  });
});

import { beforeEach, describe, expect, test, vi } from "vitest";

const prisma = {
  $queryRaw: vi.fn(),
  syncJob: {
    create: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/lib/db/prisma", () => ({
  prisma,
}));

describe("sync queue", () => {
  beforeEach(() => {
    prisma.$queryRaw.mockReset();
    prisma.syncJob.create.mockReset();
    prisma.syncJob.update.mockReset();
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
});

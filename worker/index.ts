import { env } from "../src/lib/server/env";
import { processSyncQueue, reapStaleRunningJobs, recordWorkerHeartbeat, scheduleQueuedSyncJobsForAllMailboxes } from "../src/lib/server/sync";

let isTicking = false;

async function ensureScheduledJobs() {
  const stale = await reapStaleRunningJobs();
  const scheduledCount = await scheduleQueuedSyncJobsForAllMailboxes();
  return { stale, scheduledCount };
}

async function tick() {
  if (isTicking) {
    return;
  }

  isTicking = true;
  await recordWorkerHeartbeat("tick-start");
  try {
    const { stale, scheduledCount } = await ensureScheduledJobs();

    let processed = true;
    while (processed) {
      processed = await processSyncQueue();
    }

    await recordWorkerHeartbeat(
      `idle(staleReaped=${stale.reapedCount}, staleRetried=${stale.retriedCount}, scheduled=${scheduledCount})`
    );
  } finally {
    isTicking = false;
  }
}

async function loop() {
  await recordWorkerHeartbeat("booting");

  await tick();
  setInterval(() => {
    tick().catch(async (error) => {
      await recordWorkerHeartbeat(`error:${error instanceof Error ? error.message : "unknown"}`);
      console.error("Worker tick failed", error);
    });
  }, env.SYNC_POLL_INTERVAL_MS);
}

loop().catch((error) => {
  console.error("Worker crashed", error);
  process.exit(1);
});

export { loop };

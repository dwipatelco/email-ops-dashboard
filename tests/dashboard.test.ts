import { describe, expect, test } from "vitest";

import { buildDashboardSummary } from "../src/app/(app)/dashboard/queries";

describe("dashboard summary", () => {
  test("aggregates mailbox health and traffic counts", () => {
    const summary = buildDashboardSummary({
      mailboxes: [
        { id: "1", status: "ok", lastSyncFinishedAt: new Date("2026-04-14T10:00:00.000Z") },
        { id: "2", status: "error", lastSyncFinishedAt: null }
      ],
      recentMessages: [
        { direction: "incoming", receivedAt: new Date("2026-04-14T09:00:00.000Z"), syncedAt: new Date("2026-04-14T09:00:00.000Z") },
        { direction: "outgoing", receivedAt: new Date("2026-04-14T08:00:00.000Z"), syncedAt: new Date("2026-04-14T08:00:00.000Z") },
        { direction: "incoming", receivedAt: null, syncedAt: new Date("2026-04-14T07:00:00.000Z") }
      ],
      syncRuns: [{ status: "error" }, { status: "ok" }, { status: "ok" }]
    });

    expect(summary.mailboxCount).toBe(2);
    expect(summary.healthyMailboxCount).toBe(1);
    expect(summary.failingMailboxCount).toBe(1);
    expect(summary.incomingCount).toBe(2);
    expect(summary.outgoingCount).toBe(1);
    expect(summary.failedSyncRuns).toBe(1);
    expect(summary.latestActivityAt?.toISOString()).toBe("2026-04-14T09:00:00.000Z");
  });
});

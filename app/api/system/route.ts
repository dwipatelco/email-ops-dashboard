import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/session";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
  try {
    // Basic auth check
    await requireSession();

    const { searchParams } = new URL(request.url);
    const mailboxId = searchParams.get("mailboxId") || undefined;
    const jobStatus = searchParams.get("jobStatus") || undefined;
    const runStatus = searchParams.get("runStatus") || undefined;

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      heartbeat,
      queuedJobsCount,
      runningJobsCount,
      failedJobs24h,
      failedRuns24h,
      jobs,
      runs,
      mailboxes,
    ] = await Promise.all([
      prisma.workerHeartbeat.findUnique({ where: { id: "primary" } }),
      prisma.syncJob.count({ where: { status: "queued" } }),
      prisma.syncJob.count({ where: { status: "running" } }),
      prisma.syncJob.count({
        where: { status: "failed", createdAt: { gte: twentyFourHoursAgo } },
      }),
      prisma.syncRun.count({
        where: { status: "error", startedAt: { gte: twentyFourHoursAgo } },
      }),
      prisma.syncJob.findMany({
        take: 50,
        where: {
          mailboxId: mailboxId === "all" ? undefined : mailboxId,
          status: jobStatus && jobStatus !== "all" ? (jobStatus as any) : undefined,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          reason: true,
          error: true,
          createdAt: true,
          mailbox: { select: { email: true } },
        },
      }),
      prisma.syncRun.findMany({
        take: 50,
        where: {
          mailboxId: mailboxId === "all" ? undefined : mailboxId,
          status: runStatus && runStatus !== "all" ? (runStatus as any) : undefined,
        },
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          status: true,
          startedAt: true,
          finishedAt: true,
          incomingCount: true,
          outgoingCount: true,
          errorMessage: true,
          mailbox: { select: { email: true } },
        },
      }),
      prisma.mailbox.findMany({
        select: { id: true, email: true },
        orderBy: { email: "asc" },
      }),
    ]);

    return NextResponse.json({
      heartbeat,
      metrics: {
        queuedJobs: queuedJobsCount,
        runningJobs: runningJobsCount,
        failedJobs24h,
        failedRuns24h,
      },
      jobs,
      runs,
      mailboxes,
    });
  } catch (error) {
    console.error("Failed to fetch system data:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

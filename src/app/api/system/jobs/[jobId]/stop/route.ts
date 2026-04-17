import { NextResponse } from "next/server";

import { getSession } from "@/lib/server/session";
import { stopRunningSyncJob } from "@/lib/server/sync";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;
  if (!jobId) {
    return NextResponse.json({ error: "Missing job id" }, { status: 400 });
  }

  try {
    const result = await stopRunningSyncJob(jobId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Failed to stop sync job:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

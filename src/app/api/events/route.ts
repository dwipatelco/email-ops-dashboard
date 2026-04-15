import { NextRequest, NextResponse } from "next/server";

import { countEventsVersion } from "@/app/(app)/system/queries";
import { env } from "@/lib/server/env";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let previousVersionPromise = countEventsVersion();
      const interval = setInterval(() => {
        previousVersionPromise
          .then((previousVersion) => countEventsVersion().then((currentVersion) => ({ previousVersion, currentVersion })))
          .then(({ previousVersion, currentVersion }) => {
            previousVersionPromise = Promise.resolve(currentVersion);
            if (currentVersion !== previousVersion) {
              controller.enqueue(encoder.encode(`data: ${currentVersion}\n\n`));
            }
          })
          .catch(() => {
            clearInterval(interval);
            controller.close();
          });
      }, env.EVENTS_POLL_INTERVAL_MS);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}

import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { DirectionBadge } from "@/components/features/status-badge";
import { prisma } from "@/lib/server/prisma";
import { requireSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

function formatContacts(payload: unknown): string {
  if (!Array.isArray(payload)) {
    return "-";
  }

  return payload
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return "";
      }
      const address = (entry as { address?: unknown }).address;
      return typeof address === "string" ? address : "";
    })
    .filter(Boolean)
    .join(", ");
}

export default async function MessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [session, message] = await Promise.all([
    requireSession(),
    prisma.message.findUnique({
      where: { id },
      include: { mailbox: true }
    })
  ]);

  if (!message) {
    notFound();
  }

  await prisma.auditLog.create({
    data: {
      username: session.username,
      action: "view_message",
      messageId: message.id
    }
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{message.subject ?? "(no subject)"}</CardTitle>
          <CardDescription>Mailbox: {message.mailbox.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <MetaItem label="Direction" value={<DirectionBadge direction={message.direction} />} />
            <MetaItem label="Received" value={message.receivedAt?.toISOString() ?? "-"} />
            <MetaItem label="From" value={formatContacts(message.fromJson)} />
            <MetaItem label="To" value={formatContacts(message.toJson)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plain Text Body</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-2xl border bg-muted/50 p-4 text-sm whitespace-pre-wrap">{message.bodyText ?? ""}</pre>
        </CardContent>
      </Card>

      {message.bodyHtml ? (
        <Card>
          <CardHeader>
            <CardTitle>HTML Body</CardTitle>
          </CardHeader>
          <CardContent>
            <article
              className="prose max-w-none rounded-2xl border bg-background p-4"
              dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border p-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <div>{value}</div>
    </div>
  );
}

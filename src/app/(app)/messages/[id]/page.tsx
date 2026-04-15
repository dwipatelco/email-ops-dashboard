import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DirectionBadge } from "@/components/shared/status-badge";
import { prisma } from "@/lib/db/prisma";
import { sanitizeEmailHtml } from "@/lib/server/sanitize";
import { requireSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

function formatContacts(payload: unknown): string {
  if (!Array.isArray(payload)) {
    return "-";
  }

  return payload
    .flatMap((entry) => {
      if (!entry || typeof entry !== "object") {
        return [];
      }
      const address = (entry as { address?: unknown }).address;
      return typeof address === "string" ? [address] : [];
    })
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

  const sanitizedHtmlBody = message.bodyHtml ? sanitizeEmailHtml(message.bodyHtml) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" className="gap-2 -ml-3 text-muted-foreground hover:text-foreground">
          <Link href="/messages">
            <ArrowLeftIcon className="size-4" /> Back to Messages
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b bg-muted/20 pb-4">
          <CardTitle className="text-2xl break-words line-clamp-3 leading-snug">
            {message.subject ?? "(no subject)"}
          </CardTitle>
          <CardDescription className="flex items-center gap-2 mt-2">
            <span className="font-medium text-foreground">{message.mailbox.email}</span>
            <span className="text-muted-foreground">•</span>
            <DirectionBadge direction={message.direction} />
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 text-sm md:text-base">
            <div className="grid grid-cols-[80px_1fr] md:grid-cols-[100px_1fr] gap-2 items-baseline">
              <span className="text-muted-foreground font-medium text-right">From:</span>
              <span className="font-medium break-all">{formatContacts(message.fromJson)}</span>
            </div>
            <div className="grid grid-cols-[80px_1fr] md:grid-cols-[100px_1fr] gap-2 items-baseline">
              <span className="text-muted-foreground font-medium text-right">To:</span>
              <span className="break-all">{formatContacts(message.toJson)}</span>
            </div>
            {!!message.ccJson && formatContacts(message.ccJson) !== "-" && (
              <div className="grid grid-cols-[80px_1fr] md:grid-cols-[100px_1fr] gap-2 items-baseline">
                <span className="text-muted-foreground font-medium text-right">CC:</span>
                <span className="break-all text-muted-foreground">{formatContacts(message.ccJson)}</span>
              </div>
            )}
            <div className="grid grid-cols-[80px_1fr] md:grid-cols-[100px_1fr] gap-2 items-baseline">
              <span className="text-muted-foreground font-medium text-right">Date:</span>
              <span>{message.receivedAt?.toLocaleString() ?? "-"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-0">
          <Tabs defaultValue={sanitizedHtmlBody ? "html" : "text"} className="w-full">
            <div className="border-b px-6 py-3 bg-muted/30 flex justify-between items-center rounded-t-xl">
              <h2 className="font-semibold tracking-tight text-lg">Message Body</h2>
              <TabsList className="h-8">
                <TabsTrigger value="html" disabled={!sanitizedHtmlBody} className="text-xs">HTML View</TabsTrigger>
                <TabsTrigger value="text" disabled={!message.bodyText} className="text-xs">Plain Text</TabsTrigger>
              </TabsList>
            </div>
            <CardContent className="p-0">
              <TabsContent value="html" className="m-0 border-0 outline-none">
                <div className="p-6 bg-white dark:bg-background overflow-x-auto min-h-[400px] rounded-b-xl">
                  {sanitizedHtmlBody ? (
                    <article
                      className="prose prose-sm sm:prose-base dark:prose-invert max-w-none break-words"
                      dangerouslySetInnerHTML={{ __html: sanitizedHtmlBody }}
                    />
                  ) : (
                    <p className="text-muted-foreground">No HTML body available.</p>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="text" className="m-0 border-0 outline-none">
                <pre className="p-6 text-sm font-mono whitespace-pre-wrap break-words bg-muted/30 min-h-[400px] rounded-b-xl">
                  {message.bodyText || "No plain text body available."}
                </pre>
              </TabsContent>
            </CardContent>
          </Tabs>
        </CardHeader>
      </Card>
    </div>
  );
}

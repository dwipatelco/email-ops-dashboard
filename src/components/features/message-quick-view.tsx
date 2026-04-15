"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DirectionBadge } from "@/components/features/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function formatContacts(payload: unknown): string {
  if (!Array.isArray(payload)) return "-";
  return payload
    .flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const address = (entry as { address?: unknown }).address;
      return typeof address === "string" ? [address] : [];
    })
    .join(", ");
}

type MessageDetail = {
  id: string;
  subject: string | null;
  direction: "incoming" | "outgoing";
  receivedAt: Date | null;
  fromJson: unknown;
  toJson: unknown;
  ccJson: unknown;
  bodyText: string | null;
  bodyHtml: string | null;
  mailbox: { email: string };
};

export function MessageQuickView({
  message,
  sanitizedHtmlBody,
}: {
  message: MessageDetail | null;
  sanitizedHtmlBody: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Automatically close if message is null but we have messageId,
  // or handle the 'open' state naturally
  const isOpen = !!message;

  const closeSheet = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("messageId");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeSheet()}>
      <SheetContent className="sm:max-w-[600px]! w-[90vw] flex flex-col p-0 gap-0!">
        {message && (
          <>
            <SheetHeader className="px-6 py-4 border-b">
              <div className="flex items-start justify-between gap-4 pr-6">
                <div>
                  <SheetTitle className="text-xl font-semibold break-words line-clamp-2">
                    {message.subject || "(no subject)"}
                  </SheetTitle>
                  <SheetDescription className="mt-1">
                    Mailbox: {message.mailbox.email}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Direction
                  </p>
                  <div className="mt-1">
                    <DirectionBadge direction={message.direction} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Received
                  </p>
                  <p className="mt-1">
                    {message.receivedAt?.toLocaleString() ?? "-"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    From
                  </p>
                  <p className="mt-1 text-foreground break-all">
                    {formatContacts(message.fromJson)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    To
                  </p>
                  <p className="mt-1 text-foreground break-all">
                    {formatContacts(message.toJson)}
                  </p>
                </div>
                {!!message.ccJson && formatContacts(message.ccJson) !== "-" && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      CC
                    </p>
                    <p className="mt-1 text-foreground break-all">
                      {formatContacts(message.ccJson)}
                    </p>
                  </div>
                )}
              </div>

              {/* Body Content */}
              <div className="border rounded-md">
                <Tabs
                  defaultValue={sanitizedHtmlBody ? "html" : "text"}
                  className="w-full"
                >
                  <div className="border-b px-3 py-2 bg-muted/30">
                    <TabsList className="h-8">
                      <TabsTrigger
                        value="html"
                        disabled={!sanitizedHtmlBody}
                        className="text-xs"
                      >
                        HTML View
                      </TabsTrigger>
                      <TabsTrigger
                        value="text"
                        disabled={!message.bodyText}
                        className="text-xs"
                      >
                        Plain Text
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="html" className="m-0">
                    <div className="p-4 bg-white dark:bg-background overflow-x-auto rounded-b-md">
                      {sanitizedHtmlBody ? (
                        <article
                          className="prose prose-sm dark:prose-invert max-w-none break-words"
                          dangerouslySetInnerHTML={{
                            __html: sanitizedHtmlBody,
                          }}
                        />
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          No HTML body available.
                        </p>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="text" className="m-0">
                    <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-words bg-muted/30 rounded-b-md">
                      {message.bodyText || "No plain text body available."}
                    </pre>
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            <SheetFooter className="px-6 py-4 border-t flex-row justify-between sm:justify-between items-center bg-background shrink-0">
              <Button variant="outline" onClick={closeSheet}>
                Close
              </Button>
              <Button asChild>
                <Link href={`/messages/${message.id}`}>
                  Full Details <ExternalLinkIcon className="ml-2 size-4" />
                </Link>
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

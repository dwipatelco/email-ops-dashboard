"use client";

import nextDynamic from "next/dynamic";

type MessageRow = {
  id: string;
  mailboxEmail: string;
  direction: "incoming" | "outgoing";
  fromText: string;
  toText: string;
  subject: string | null;
  snippet: string | null;
  receivedAt: string | null;
  syncedAt: string;
};

const DynamicMessagesTable = nextDynamic(
  () =>
    import("@/components/features/messages-table").then(
      (module) => module.MessagesTable,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Loading message table...
      </div>
    ),
  },
);

export function MessagesTableLazy({ rows }: { rows: MessageRow[] }) {
  return <DynamicMessagesTable rows={rows} />;
}

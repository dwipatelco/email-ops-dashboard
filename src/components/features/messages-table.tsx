"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import {
  CaretDownIcon,
  CaretUpIcon,
  ArrowsDownUpIcon,
} from "@phosphor-icons/react";

import { DirectionBadge } from "@/components/features/status-badge";
import type { MessageSortBy, MessageSortDir } from "@/lib/server/data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type MessageRow = {
  id: string;
  mailboxEmail: string;
  direction: "incoming" | "outgoing";
  folderName: string;
  fromText: string;
  toText: string;
  subject: string | null;
  snippet: string | null;
  receivedAt: string | null;
  syncedAt: string;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return format(new Date(value), "yyyy-MM-dd HH:mm");
}

function SortHeader({
  label,
  column,
  activeSortBy,
  activeSortDir,
  href,
}: {
  label: string;
  column: MessageSortBy;
  activeSortBy: MessageSortBy;
  activeSortDir: MessageSortDir;
  href: string;
}) {
  const isActive = activeSortBy === column;

  return (
    <Link
      className="inline-flex items-center gap-1 hover:text-foreground"
      href={href}
    >
      <span>{label}</span>
      {isActive ? (
        activeSortDir === "asc" ? (
          <CaretUpIcon data-icon="inline-end" />
        ) : (
          <CaretDownIcon data-icon="inline-end" />
        )
      ) : (
        <ArrowsDownUpIcon data-icon="inline-end" />
      )}
    </Link>
  );
}

function TruncatedCell({
  text,
  emptyState = "-",
}: {
  text: string | null;
  emptyState?: string;
}) {
  if (!text) return <span className="block truncate">{emptyState}</span>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block truncate cursor-default max-w-full text-left">
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[400px] break-words whitespace-pre-wrap p-2 shadow-lg z-50 pointer-events-auto select-text">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export function MessagesTable({
  rows,
  sortBy,
  sortDir,
  sortHrefs,
}: {
  rows: MessageRow[];
  sortBy: MessageSortBy;
  sortDir: MessageSortDir;
  sortHrefs: Record<MessageSortBy, string>;
}) {
  const router = useRouter();

  return (
    <TooltipProvider delayDuration={300}>
      <Table className="min-w-[1320px] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[16ch]">
              <SortHeader
                label="Received"
                column="receivedAt"
                activeSortBy={sortBy}
                activeSortDir={sortDir}
                href={sortHrefs.receivedAt}
              />
            </TableHead>
            <TableHead className="w-[24ch]">
              <SortHeader
                label="Mailbox"
                column="mailbox"
                activeSortBy={sortBy}
                activeSortDir={sortDir}
                href={sortHrefs.mailbox}
              />
            </TableHead>
            <TableHead className="w-[12ch]">
              <SortHeader
                label="Direction"
                column="direction"
                activeSortBy={sortBy}
                activeSortDir={sortDir}
                href={sortHrefs.direction}
              />
            </TableHead>
            <TableHead className="w-[24ch]">From</TableHead>
            <TableHead className="w-[24ch]">To</TableHead>
            <TableHead className="w-[26ch]">
              <SortHeader
                label="Subject"
                column="subject"
                activeSortBy={sortBy}
                activeSortDir={sortDir}
                href={sortHrefs.subject}
              />
            </TableHead>
            <TableHead className="w-[28ch]">Snippet</TableHead>
            <TableHead className="w-[16ch]">
              <SortHeader
                label="Synced"
                column="syncedAt"
                activeSortBy={sortBy}
                activeSortDir={sortDir}
                href={sortHrefs.syncedAt}
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              tabIndex={0}
              role="link"
              className="cursor-pointer"
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set("messageId", row.id);
                router.push(url.pathname + url.search, { scroll: false });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  const url = new URL(window.location.href);
                  url.searchParams.set("messageId", row.id);
                  router.push(url.pathname + url.search, { scroll: false });
                }
              }}
            >
              <TableCell>{formatDateTime(row.receivedAt)}</TableCell>
              <TableCell>
                <TruncatedCell text={row.mailboxEmail} />
              </TableCell>
              <TableCell>
                <DirectionBadge direction={row.direction} />
              </TableCell>
              <TableCell className="max-w-[18ch]">
                <TruncatedCell text={row.fromText} />
              </TableCell>
              <TableCell className="max-w-[18ch]">
                <TruncatedCell text={row.toText} />
              </TableCell>
              <TableCell className="max-w-[26ch]">
                <TruncatedCell text={row.subject} emptyState="(no subject)" />
              </TableCell>
              <TableCell className="max-w-[28ch]">
                <span className="block truncate text-muted-foreground">
                  {row.snippet ?? "-"}
                </span>
              </TableCell>
              <TableCell>{formatDateTime(row.syncedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}

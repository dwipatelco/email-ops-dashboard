import Link from "next/link";
import { format } from "date-fns";

import { DirectionBadge } from "@/components/features/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

export type MessageRow = {
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

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return format(new Date(value), "yyyy-MM-dd HH:mm");
}

export function MessagesTable({ rows }: { rows: MessageRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Received</TableHead>
          <TableHead>Mailbox</TableHead>
          <TableHead>Direction</TableHead>
          <TableHead>From</TableHead>
          <TableHead>To</TableHead>
          <TableHead>Subject</TableHead>
          <TableHead>Snippet</TableHead>
          <TableHead>Synced</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{formatDateTime(row.receivedAt)}</TableCell>
            <TableCell className="max-w-[18ch] truncate">{row.mailboxEmail}</TableCell>
            <TableCell>
              <DirectionBadge direction={row.direction} />
            </TableCell>
            <TableCell className="max-w-[20ch] truncate">{row.fromText || "-"}</TableCell>
            <TableCell className="max-w-[20ch] truncate">{row.toText || "-"}</TableCell>
            <TableCell className="max-w-[30ch]">
              <Link className="font-medium text-primary hover:underline" href={`/messages/${row.id}`}>
                {row.subject ?? "(no subject)"}
              </Link>
            </TableCell>
            <TableCell className="max-w-[40ch] truncate text-muted-foreground">{row.snippet ?? "-"}</TableCell>
            <TableCell>{formatDateTime(row.syncedAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

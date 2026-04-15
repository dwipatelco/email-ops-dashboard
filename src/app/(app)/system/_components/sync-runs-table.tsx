import { formatDistanceToNow } from "date-fns";
import { InboxIcon } from "lucide-react";

import { SyncRunStatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";

interface SyncRunsTableProps {
  runs: any[];
}

export function SyncRunsTable({ runs }: SyncRunsTableProps) {
  if (runs.length === 0) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <InboxIcon />
            </EmptyMedia>
            <EmptyTitle>No runs found</EmptyTitle>
            <EmptyDescription>
              There are currently no sync runs matching your filters.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-t-0">
            <TableHead>Mailbox</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Started</TableHead>
            <TableHead className="text-right">In</TableHead>
            <TableHead className="text-right">Out</TableHead>
            <TableHead>Error</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => (
            <TableRow key={run.id}>
              <TableCell className="font-medium">{run.mailbox.email}</TableCell>
              <TableCell>
                <SyncRunStatusBadge status={run.status} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDistanceToNow(new Date(run.startedAt), {
                  addSuffix: true,
                })}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {run.incomingCount}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {run.outgoingCount}
              </TableCell>
              <TableCell className="max-w-[48ch] whitespace-normal break-words text-muted-foreground text-xs">
                {run.errorMessage ?? "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

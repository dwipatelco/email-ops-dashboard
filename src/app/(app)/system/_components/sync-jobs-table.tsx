import { formatDistanceToNow } from "date-fns";
import { InboxIcon } from "lucide-react";

import { SyncJobStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
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
import { SystemJobRow } from "./types";

interface SyncJobsTableProps {
  jobs: SystemJobRow[];
  stoppingJobId: string | null;
  onStopJob: (jobId: string) => void;
}

export function SyncJobsTable({ jobs, stoppingJobId, onStopJob }: SyncJobsTableProps) {
  if (jobs.length === 0) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <InboxIcon />
            </EmptyMedia>
            <EmptyTitle>No jobs found</EmptyTitle>
            <EmptyDescription>
              There are currently no sync jobs matching your filters.
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
            <TableHead>Reason</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Error</TableHead>
            <TableHead className="w-[92px] text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell className="font-medium">{job.mailbox.email}</TableCell>
              <TableCell>
                <SyncJobStatusBadge status={job.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">{job.reason}</TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDistanceToNow(new Date(job.createdAt), {
                  addSuffix: true,
                })}
              </TableCell>
              <TableCell className="max-w-[48ch] whitespace-normal break-words text-muted-foreground text-xs">
                {job.error ?? "-"}
              </TableCell>
              <TableCell className="text-right">
                {job.status === "running" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={stoppingJobId === job.id}
                    onClick={() => onStopJob(job.id)}
                  >
                    {stoppingJobId === job.id ? "Stopping..." : "Stop"}
                  </Button>
                ) : (
                  "-"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

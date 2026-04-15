import { formatDistanceToNow } from "date-fns";

import { SyncJobStatusBadge, SyncRunStatusBadge } from "@/components/features/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { getSystemStatus } from "@/lib/server/data";

export const dynamic = "force-dynamic";

export default async function SystemPage() {
  const data = await getSystemStatus();

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Worker Health</CardTitle>
          <CardDescription>
            Last heartbeat: {data.heartbeat ? formatDistanceToNow(data.heartbeat.lastSeenAt, { addSuffix: true }) : "No heartbeat yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Current state: {data.heartbeat?.currentState ?? "unknown"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sync Jobs</CardTitle>
          <CardDescription>Queue and execution status for mailbox sync jobs.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mailbox</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>{job.mailbox.email}</TableCell>
                  <TableCell>
                    <SyncJobStatusBadge status={job.status} />
                  </TableCell>
                  <TableCell>{job.reason}</TableCell>
                  <TableCell>{formatDistanceToNow(job.createdAt, { addSuffix: true })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sync Runs</CardTitle>
          <CardDescription>Execution outcomes and traffic volume per run.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mailbox</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Incoming</TableHead>
                <TableHead>Outgoing</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell>{run.mailbox.email}</TableCell>
                  <TableCell>
                    <SyncRunStatusBadge status={run.status} />
                  </TableCell>
                  <TableCell>{formatDistanceToNow(run.startedAt, { addSuffix: true })}</TableCell>
                  <TableCell>{run.incomingCount}</TableCell>
                  <TableCell>{run.outgoingCount}</TableCell>
                  <TableCell className="max-w-[30ch] truncate text-muted-foreground">{run.errorMessage ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

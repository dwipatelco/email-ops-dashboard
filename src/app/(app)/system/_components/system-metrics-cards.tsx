import { formatDistanceToNow } from "date-fns";
import { ActivityIcon, ServerIcon, AlertTriangleIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SystemData } from "./types";

interface SystemMetricsCardsProps {
  data: SystemData;
}

export function SystemMetricsCards({ data }: SystemMetricsCardsProps) {
  const lastHeartbeatDate = data.heartbeat
    ? new Date(data.heartbeat.lastSeenAt)
    : null;
  const isWorkerOnline =
    lastHeartbeatDate &&
    Date.now() - lastHeartbeatDate.getTime() < 5 * 60 * 1000;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium">Worker Status</CardTitle>
          </div>
          <ServerIcon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight flex items-center gap-2">
            {isWorkerOnline ? (
              <span className="text-emerald-600">Online</span>
            ) : (
              <span className="text-destructive">Offline</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Last seen:{" "}
            {lastHeartbeatDate
              ? formatDistanceToNow(lastHeartbeatDate, { addSuffix: true })
              : "Never"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium">Queue Depth</CardTitle>
          </div>
          <ActivityIcon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight">
            {data.metrics.queuedJobs + data.metrics.runningJobs}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {data.metrics.queuedJobs} queued, {data.metrics.runningJobs} running
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium">Errors (24h)</CardTitle>
          </div>
          <AlertTriangleIcon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight text-destructive">
            {data.metrics.failedJobs24h + data.metrics.failedRuns24h}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {data.metrics.failedJobs24h} failed jobs, {data.metrics.failedRuns24h} failed runs
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

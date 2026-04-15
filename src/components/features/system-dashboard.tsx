"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ActivityIcon,
  RefreshCwIcon,
  ServerIcon,
  AlertTriangleIcon,
  InboxIcon,
} from "lucide-react";

import {
  SyncJobStatusBadge,
  SyncRunStatusBadge,
} from "@/components/features/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";

type SystemData = {
  heartbeat: { lastSeenAt: string; currentState: string } | null;
  metrics: {
    queuedJobs: number;
    runningJobs: number;
    failedJobs24h: number;
    failedRuns24h: number;
  };
  jobs: any[];
  runs: any[];
  mailboxes: { id: string; email: string }[];
};

export function SystemDashboard({ initialData }: { initialData: SystemData }) {
  const [data, setData] = useState<SystemData>(initialData);
  const [isLive, setIsLive] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [mailboxFilter, setMailboxFilter] = useState<string>("all");
  const [jobStatusFilter, setJobStatusFilter] = useState<string>("all");
  const [runStatusFilter, setRunStatusFilter] = useState<string>("all");

  const [activeTab, setActiveTab] = useState("jobs");

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const params = new URLSearchParams();
      if (mailboxFilter !== "all") params.set("mailboxId", mailboxFilter);
      if (jobStatusFilter !== "all") params.set("jobStatus", jobStatusFilter);
      if (runStatusFilter !== "all") params.set("runStatus", runStatusFilter);

      const res = await fetch(`/api/system?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch system data");
      const newData = await res.json();
      setData(newData);
    } catch (error) {
      console.error(error);
    } finally {
      setIsRefreshing(false);
    }
  }, [mailboxFilter, jobStatusFilter, runStatusFilter]);

  // Handle live polling
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isLive) {
      intervalId = setInterval(fetchData, 5000); // poll every 5s
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isLive, fetchData]);

  // When filters change, instantly fetch new data
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Determine Worker Status
  const lastHeartbeatDate = data.heartbeat
    ? new Date(data.heartbeat.lastSeenAt)
    : null;
  const isWorkerOnline =
    lastHeartbeatDate &&
    Date.now() - lastHeartbeatDate.getTime() < 5 * 60 * 1000; // 5 mins

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-1.5 mb-2">
        <h1 className="text-2xl font-semibold tracking-tight">System Status</h1>
        <p className="text-sm text-muted-foreground">
          Monitor background workers and synchronization tasks.
        </p>
      </div>
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium">
                Worker Status
              </CardTitle>
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
              {data.metrics.queuedJobs} queued, {data.metrics.runningJobs}{" "}
              running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium">
                Errors (24h)
              </CardTitle>
            </div>
            <AlertTriangleIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-destructive">
              {data.metrics.failedJobs24h + data.metrics.failedRuns24h}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {data.metrics.failedJobs24h} failed jobs,{" "}
              {data.metrics.failedRuns24h} failed runs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar (Filters and View Toggle) */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-2 shadow-sm">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <Select value={mailboxFilter} onValueChange={setMailboxFilter}>
              <SelectTrigger className="h-9 w-full sm:w-[220px]">
                <SelectValue placeholder="All mailboxes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All mailboxes</SelectItem>
                {data.mailboxes.map((mb) => (
                  <SelectItem key={mb.id} value={mb.id}>
                    {mb.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeTab === "jobs" ? (
              <Select
                value={jobStatusFilter}
                onValueChange={setJobStatusFilter}
              >
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={runStatusFilter}
                onValueChange={setRunStatusFilter}
              >
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder="All outcomes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All outcomes</SelectItem>
                  <SelectItem value="ok">Healthy</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            )}

            <div className="flex items-center gap-4 px-3 py-1.5 ml-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="live-update"
                  checked={isLive}
                  onCheckedChange={setIsLive}
                />
                <Label
                  htmlFor="live-update"
                  className="text-sm cursor-pointer flex items-center gap-1.5"
                >
                  Live Update
                  {isLive && (
                    <span className="flex size-2 rounded-full bg-green-500 animate-pulse" />
                  )}
                </Label>
              </div>
              <div className="w-px h-5 bg-border mx-1" />
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={fetchData}
                disabled={isRefreshing}
              >
                <RefreshCwIcon
                  className={`size-4 ${isRefreshing ? "animate-spin text-primary" : "text-muted-foreground"}`}
                />
                <span className="sr-only">Refresh</span>
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-[200px]"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="jobs">Sync Jobs</TabsTrigger>
                <TabsTrigger value="runs">Sync Runs</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === "jobs" ? "Queue Activity" : "Execution History"}
          </CardTitle>
          <CardDescription>
            {activeTab === "jobs"
              ? "Live execution status of mailbox sync tasks."
              : "Outcomes and volume per synchronization run."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {activeTab === "jobs" ? (
            data.jobs.length === 0 ? (
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
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-t-0">
                      <TableHead>Mailbox</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">
                          {job.mailbox.email}
                        </TableCell>
                        <TableCell>
                          <SyncJobStatusBadge status={job.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {job.reason}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDistanceToNow(new Date(job.createdAt), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell className="max-w-[48ch] whitespace-normal break-words text-muted-foreground text-xs">
                          {job.error ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : data.runs.length === 0 ? (
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
          ) : (
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
                  {data.runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="font-medium">
                        {run.mailbox.email}
                      </TableCell>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { RefreshCwIcon } from "lucide-react";

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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SyncJobsTable } from "./sync-jobs-table";
import { SyncRunsTable } from "./sync-runs-table";
import { SystemData } from "./types";

interface SystemTabsProps {
  data: SystemData;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mailboxFilter: string;
  setMailboxFilter: (filter: string) => void;
  jobStatusFilter: string;
  setJobStatusFilter: (filter: string) => void;
  runStatusFilter: string;
  setRunStatusFilter: (filter: string) => void;
  isLive: boolean;
  setIsLive: (live: boolean) => void;
  isRefreshing: boolean;
  fetchData: () => void;
}

export function SystemTabs({
  data,
  activeTab,
  setActiveTab,
  mailboxFilter,
  setMailboxFilter,
  jobStatusFilter,
  setJobStatusFilter,
  runStatusFilter,
  setRunStatusFilter,
  isLive,
  setIsLive,
  isRefreshing,
  fetchData,
}: SystemTabsProps) {
  return (
    <>
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
            <SyncJobsTable jobs={data.jobs} />
          ) : (
            <SyncRunsTable runs={data.runs} />
          )}
        </CardContent>
      </Card>
    </>
  );
}

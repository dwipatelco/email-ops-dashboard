"use client";

import { useEffect, useState, useCallback } from "react";

import { SystemMetricsCards } from "./system-metrics-cards";
import { SystemTabs } from "./system-tabs";
import { SystemData } from "./types";

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
      <SystemMetricsCards data={data} />

      {/* Toolbar and Main Content */}
      <SystemTabs
        data={data}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mailboxFilter={mailboxFilter}
        setMailboxFilter={setMailboxFilter}
        jobStatusFilter={jobStatusFilter}
        setJobStatusFilter={setJobStatusFilter}
        runStatusFilter={runStatusFilter}
        setRunStatusFilter={setRunStatusFilter}
        isLive={isLive}
        setIsLive={setIsLive}
        isRefreshing={isRefreshing}
        fetchData={fetchData}
      />
    </div>
  );
}

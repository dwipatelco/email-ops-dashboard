export type SystemData = {
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

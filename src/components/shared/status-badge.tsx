import { Badge } from "@/components/ui/badge";

export function MailboxStatusBadge({ status }: { status: "idle" | "syncing" | "ok" | "error" }) {
  if (status === "ok") {
    return <Badge variant="secondary">Healthy</Badge>;
  }

  if (status === "syncing") {
    return <Badge>Syncing</Badge>;
  }

  if (status === "error") {
    return <Badge variant="destructive">Failing</Badge>;
  }

  return <Badge variant="outline">Idle</Badge>;
}

export function SyncJobStatusBadge({ status }: { status: "queued" | "running" | "completed" | "failed" }) {
  if (status === "completed") {
    return <Badge variant="secondary">Completed</Badge>;
  }

  if (status === "running") {
    return <Badge>Running</Badge>;
  }

  if (status === "failed") {
    return <Badge variant="destructive">Failed</Badge>;
  }

  return <Badge variant="outline">Queued</Badge>;
}

export function SyncRunStatusBadge({ status }: { status: "running" | "ok" | "error" }) {
  if (status === "ok") {
    return <Badge variant="secondary">Healthy</Badge>;
  }

  if (status === "running") {
    return <Badge>Running</Badge>;
  }

  return <Badge variant="destructive">Error</Badge>;
}

export function DirectionBadge({ direction }: { direction: "incoming" | "outgoing" }) {
  if (direction === "incoming") {
    return <Badge variant="secondary">Incoming</Badge>;
  }

  return <Badge variant="outline">Outgoing</Badge>;
}

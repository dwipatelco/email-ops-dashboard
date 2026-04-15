import { formatDistanceToNow } from "date-fns";
import { MailboxStatusBadge } from "@/components/features/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { getDashboardData, normalizeMailboxStatus } from "@/lib/server/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Mailboxes"
          value={String(data.summary.mailboxCount)}
          detail={`${data.summary.healthyMailboxCount} healthy / ${data.summary.failingMailboxCount} failing`}
          icon="•"
        />
        <StatCard
          label="Incoming (recent)"
          value={String(data.summary.incomingCount)}
          detail={`${data.summary.outgoingCount} outgoing in same window`}
          icon="•"
        />
        <StatCard
          label="Outgoing (recent)"
          value={String(data.summary.outgoingCount)}
          detail="Traffic from sent folders"
          icon="•"
        />
        <StatCard
          label="Failed Sync Runs"
          value={String(data.summary.failedSyncRuns)}
          detail={
            data.summary.latestActivityAt
              ? `Latest activity ${formatDistanceToNow(data.summary.latestActivityAt, { addSuffix: true })}`
              : "No activity yet"
          }
          icon="•"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mailbox Health</CardTitle>
          <CardDescription>
            Worker heartbeat: {data.heartbeat ? formatDistanceToNow(data.heartbeat.lastSeenAt, { addSuffix: true }) : "No heartbeat yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.mailboxSnapshots.map((mailbox) => (
              <div key={mailbox.id} className="flex flex-col gap-3 rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-medium">{mailbox.email}</h3>
                    <p className="text-xs text-muted-foreground">
                      {mailbox.host}:{mailbox.port}
                    </p>
                  </div>
                  <MailboxStatusBadge status={mailbox.status} />
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>State: {normalizeMailboxStatus(mailbox.status)}</p>
                  <p>Last error: {mailbox.lastSyncError ?? "-"}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription className="flex items-center justify-between uppercase tracking-wide">
          <span>{label}</span>
          {icon}
        </CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-xs text-muted-foreground">{detail}</CardContent>
    </Card>
  );
}

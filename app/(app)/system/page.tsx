import { getSystemStatus } from "@/lib/server/data";
import { SystemDashboard } from "@/components/features/system-dashboard";

export const dynamic = "force-dynamic";

export default async function SystemPage() {
  const data = await getSystemStatus();

  return (
    <SystemDashboard initialData={data as any} />
  );
}

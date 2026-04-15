import { getSystemStatus } from "@/app/(app)/system/queries";
import { SystemDashboard } from "./_components/system-dashboard";

export const dynamic = "force-dynamic";

export default async function SystemPage() {
  const data = await getSystemStatus();

  return (
    <SystemDashboard initialData={data as any} />
  );
}

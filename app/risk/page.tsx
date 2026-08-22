import { RiskWorkspace } from "@/app/features/risk/components/risk-workspace";
import type { RiskPayload } from "@/lib/risk-contracts";
import { listRisk } from "@/lib/server/risk-service";

export const dynamic = "force-dynamic";

export default async function RiskPage() {
  let payload: RiskPayload = {
    report: null,
    signals: [],
    sources: [],
    stale: true,
    fetchedAt: new Date().toISOString(),
  };
  try {
    payload = await listRisk();
  } catch {
    // The explicit empty state remains operable if D1 is unavailable locally.
  }
  return <RiskWorkspace initialPayload={payload} />;
}

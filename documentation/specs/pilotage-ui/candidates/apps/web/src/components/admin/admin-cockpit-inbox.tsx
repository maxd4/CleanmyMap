import { CreatorInboxPanel } from "./creator-inbox-panel";
import type { AdminSources } from "@/lib/admin/admin-dashboard-contract";
import { CmmCard } from "@/components/ui/cmm-card";
import { SystemStateRetryButton } from "@/components/ui/system-state-retry-button";

export function AdminCockpitInbox({ source, canQualify }: { source: AdminSources["creatorInbox"]; canQualify: boolean }) {
  if (source.status === "unavailable") return (
    <CmmCard className="space-y-3">
      <h2 className="text-lg font-bold cmm-text-primary">Boîte créateur indisponible</h2>
      <p role="status" className="cmm-text-secondary">La file n'a pas pu être chargée. Le journal reste indépendant.</p>
      <SystemStateRetryButton label="Réessayer le chargement" />
    </CmmCard>
  );
  const page = source.data;
  return <CreatorInboxPanel initialItems={Array.isArray(page) ? page : page.items}
    initialHasMore={Array.isArray(page) ? undefined : page.hasMore}
    initialNextCursor={Array.isArray(page) ? undefined : page.nextCursor}
    canQualify={canQualify}
    feedbackMetrics={Array.isArray(page) || !canQualify ? undefined : page.feedbackMetrics} />;
}

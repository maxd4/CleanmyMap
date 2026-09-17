import { CommunityFunnelExportCard } from "@/components/sections/rubriques/community/funnel-export-card";
import { CommunityPostEventLoopCard } from "@/components/sections/rubriques/community/post-event-loop-card";
import { CommunityRemindersCard } from "@/components/sections/rubriques/community/reminders-card";
import { CommunityStaffingCard } from "@/components/sections/rubriques/community/staffing-card";
import type { PilotageCommunityOperations } from "@/lib/pilotage/community-operations";

export function PilotageCommunityOperationsPanel({
  operations,
  canExportFunnel,
}: {
  operations: PilotageCommunityOperations;
  canExportFunnel: boolean;
}) {
  return (
    <section className="space-y-4" aria-labelledby="pilotage-community-operations-title" data-testid="pilotage-community-operations">
      <div>
        <h2 id="pilotage-community-operations-title" className="text-2xl font-black text-white">
          Opérations communautaires
        </h2>
        <p className="mt-1 text-sm text-orange-100/75">
          Vues agrégées pour le pilotage autorisé. Les commandes personnelles restent dans le détail de chaque mission.
        </p>
      </div>
      <CommunityStaffingCard staffingPlan={operations.staffingPlan} />
      <CommunityRemindersCard reminders={operations.reminders} />
      <CommunityPostEventLoopCard postEventLoop={operations.postEventLoop} />
      {canExportFunnel ? <CommunityFunnelExportCard /> : null}
    </section>
  );
}

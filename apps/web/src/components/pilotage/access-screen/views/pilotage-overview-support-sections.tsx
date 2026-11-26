import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { ADMIN_GODMODE_ROUTE, ADMIN_ROUTE, DASHBOARD_ROUTE } from "@/lib/accueil-pilotage-routes";
import type { PilotageLocale } from "../access-screen-constants";
import type { PilotageOverview } from "@/lib/pilotage/overview";
import type { NavigationGridItem } from "@/components/ui/navigation-grid";

type PilotageOverviewSupportSectionsProps = {
  locale: PilotageLocale;
  accessEyebrow: string;
  overview: PilotageOverview | null;
  overviewLinks: NavigationGridItem[];
  accessAllowed: boolean;
};

export function PilotageOverviewSupportSections({ locale, overview, overviewLinks }: PilotageOverviewSupportSectionsProps) {
  const fr = locale === "fr";
  const links = overviewLinks.filter(link => link.href !== ADMIN_ROUTE && link.href !== ADMIN_GODMODE_ROUTE);
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold cmm-text-primary">{fr ? "Outils et rapports" : "Tools and reports"}</h2>
      <p className="text-sm cmm-text-secondary">{fr ? "Les preuves détaillées et les rapports restent dans leurs rubriques dédiées. Chaque destination conserve ses propres droits." : "Detailed evidence and reports remain in their dedicated sections. Each destination retains its own access controls."}</p>
      {overview ? <p className="text-sm cmm-text-secondary">{overview.contracts.length} {fr ? "contrats dans le corpus chargé" : "records in the loaded corpus"}</p> : <p role="status" className="text-sm cmm-text-secondary">{fr ? "Synthèse indisponible. Les raccourcis restent accessibles." : "Summary unavailable. Shortcuts remain accessible."}</p>}
      <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {links.map(link => <CmmCard key={link.href} className="space-y-3">
          <h3 className="font-bold cmm-text-primary">{link.title}</h3>
          <p className="text-sm cmm-text-secondary">{link.href === DASHBOARD_ROUTE ? (fr ? "Vos raccourcis personnels et notifications." : "Your personal shortcuts and notifications.") : link.desc}</p>
          <CmmButton href={link.href} tone="secondary">{fr ? "Ouvrir" : "Open"}</CmmButton>
        </CmmCard>)}
        <CmmCard className="space-y-3">
          <h3 className="font-bold cmm-text-primary">{fr ? "Gouvernance" : "Governance"}</h3>
          <p className="text-sm cmm-text-secondary">{fr ? "Lecture territoriale et arbitrages dans la surface dédiée." : "Territorial analysis and arbitration in the dedicated surface."}</p>
          <CmmButton href="/sections/elus" tone="secondary">{fr ? "Ouvrir" : "Open"}</CmmButton>
        </CmmCard>
      </div>
    </section>
  );
}

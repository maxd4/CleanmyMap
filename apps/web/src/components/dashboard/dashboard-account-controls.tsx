import { AccountEvolutionStatusLink } from "@/components/account/account-evolution-status-link";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import type { GrantedRole } from "@/lib/domain-language";
import { getProfileLabel } from "@/lib/profiles";

type DashboardAccountControlsProps = {
  locale: "fr" | "en";
  grantedRole: GrantedRole;
};

export function DashboardAccountControls({ locale, grantedRole }: DashboardAccountControlsProps) {
  const fr = locale === "fr";
  return (
    <div className="grid items-start gap-4 md:grid-cols-2">
      <CmmCard className="space-y-3">
        <h3 className="text-lg font-bold cmm-text-primary">{fr ? "Évolution du compte" : "Account progress"}</h3>
        <p className="text-sm cmm-text-secondary">{fr ? "Rôle attribué : " : "Granted role: "}{getProfileLabel(grantedRole, locale)}</p>
        <AccountEvolutionStatusLink appearance="neutral"
          label={fr ? "Faire évoluer mon compte" : "Account progress"}
          pendingLabel={fr ? "Voir ma demande" : "View my request"} />
      </CmmCard>
      <CmmCard className="space-y-3">
        <h3 className="text-lg font-bold cmm-text-primary">{fr ? "Préférences et compte" : "Preferences and account"}</h3>
        <p className="text-sm cmm-text-secondary">{fr ? "Langue, affichage, confidentialité, localisation et gestion des données." : "Language, display, privacy, location and data management."}</p>
        <CmmButton href="/reglages" tone="secondary">{fr ? "Ouvrir les réglages" : "Open settings"}</CmmButton>
      </CmmCard>
    </div>
  );
}

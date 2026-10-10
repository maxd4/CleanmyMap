import { AccountEvolutionCta } from "@/components/account/account-evolution-cta";
import { AccountSettingsSection } from "@/components/account/account-settings-section";
import { FamilyRubriqueCard } from "@/components/ui/family-rubrique-card";
import type { GrantedRole } from "@/lib/domain-language";

type DashboardAccountControlsProps = {
  locale: "fr" | "en";
  grantedRole: GrantedRole;
};

export function DashboardAccountControls({
  locale,
  grantedRole,
}: DashboardAccountControlsProps) {
  return (
    <div
      data-gsap-reveal
      className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]"
    >
      <FamilyRubriqueCard
        withTopBar={true}
        topBarContent={locale === "fr" ? "Évolution du compte" : "Account progress"}
        className="p-8 sm:p-10"
      >
        <AccountEvolutionCta currentRole={grantedRole} />
      </FamilyRubriqueCard>

      <FamilyRubriqueCard
        withTopBar={true}
        topBarContent={locale === "fr" ? "Configuration" : "Settings"}
        className="p-8 sm:p-10"
      >
        <AccountSettingsSection compact />
      </FamilyRubriqueCard>
    </div>
  );
}

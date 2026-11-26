import { ArrowRight, BarChart3, Compass, ShieldCheck, UserRound } from "lucide-react";
import type { PilotageLocale } from "../access-screen-constants";
import { getProfileLabel, type AppProfile, type ProfileAction } from "@/lib/profiles";
import type { EffectiveAccess } from "@/lib/domain-language";
import { PageHeader } from "@/components/ui/page-header";
import { CmmPageLayout } from "@/components/ui/cmm-section";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { SystemStateRetryButton } from "@/components/ui/system-state-retry-button";
import { getPageFamilyById } from "@/lib/ui/page-families";
import { buildRestrictedPilotageSections } from "./pilotage-restricted-page.model";

const SECTION_COPY = {
  supervision: { fr: "Supervision", en: "Supervision", icon: ShieldCheck },
  analysis: { fr: "Observer et analyser", en: "Observe and analyze", icon: BarChart3 },
  profile: { fr: "Mon rôle et mon espace", en: "My role and dashboard", icon: UserRound },
} as const;

function PilotageAccessCard({ action, locale, primary }: { action: ProfileAction; locale: PilotageLocale; primary: boolean }) {
  return (
    <CmmCard as="article" className="flex min-w-0 flex-col gap-3">
      <h3 className="text-lg font-bold cmm-text-primary">{action.label[locale]}</h3>
      <p className="text-sm cmm-text-secondary">{action.description[locale]}</p>
      <div className="mt-auto">
        <CmmButton href={action.href} tone={primary ? "primary" : "secondary"} ariaLabel={action.label[locale]}>
          {locale === "fr" ? "Ouvrir" : "Open"} <ArrowRight size={16} aria-hidden="true" />
        </CmmButton>
      </div>
    </CmmCard>
  );
}

export function PilotageRestrictedPage({ locale, profile, access }: { locale: PilotageLocale; profile: AppProfile; access: EffectiveAccess | null }) {
  const fr = locale === "fr";
  const sections = buildRestrictedPilotageSections(profile, access);
  return (
    <CmmPageLayout>
      <PageHeader family={getPageFamilyById("accueil-pilotage")}
        title={fr ? "Pilotage" : "Operations"}
        subtitle={fr ? "Les outils de suivi adaptés à votre rôle." : "Monitoring tools for your role."}
        action={<span className="text-sm font-semibold cmm-text-secondary">{fr ? "Rôle actif : " : "Active role: "}{getProfileLabel(profile, locale)}</span>} />
      <CmmCard size="sm" className="flex flex-wrap items-start gap-3">
        <Compass size={20} aria-hidden="true" className="mt-1 shrink-0 cmm-text-secondary" />
        <div className="min-w-0 flex-1 space-y-1" role="status">
          <h2 className="font-bold cmm-text-primary">{access ? (fr ? "Pilotage des actions organisées" : "Organized-action monitoring") : (fr ? "Droits momentanément non vérifiés" : "Access temporarily unverified")}</h2>
          <p className="text-sm cmm-text-secondary">{access
            ? (fr ? "Les indicateurs des actions organisées sont réservés au rôle actif Coordinateur. Les autres outils conservent leurs propres conditions d'accès." : "Organized-action metrics require the active Coordinator role. Other tools retain their own access requirements.")
            : (fr ? "La vérification a échoué. Aucun indicateur privé ni raccourci administratif n'est affiché." : "Access verification failed. No private metrics or administrative shortcuts are shown.")}</p>
        </div>
        {!access && <SystemStateRetryButton label={fr ? "Réessayer" : "Retry"} />}
      </CmmCard>
      {sections.map(section => {
        const copy = SECTION_COPY[section.id];
        const Icon = copy.icon;
        return (
          <section key={section.id} aria-labelledby={`pilotage-access-${section.id}`} className="space-y-3">
            <h2 id={`pilotage-access-${section.id}`} className="flex items-center gap-2 text-xl font-bold cmm-text-primary"><Icon size={20} aria-hidden="true" /> {copy[locale]}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.actions.map((action, index) => <PilotageAccessCard key={action.href} action={action} locale={locale} primary={section.id === "supervision" && index === 0} />)}
            </div>
          </section>
        );
      })}
    </CmmPageLayout>
  );
}

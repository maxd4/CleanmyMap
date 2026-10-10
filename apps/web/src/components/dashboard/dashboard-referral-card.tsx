import { ArrowRight } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { FamilyRubriqueCard } from "@/components/ui/family-rubrique-card";
import { buildProfileRoute } from "@/lib/accueil-pilotage-routes";
import type { DashboardPageData } from "@/lib/dashboard/page-data";
import { DashboardReferralStatusGrid } from "./dashboard-referral-status-grid";

type ReferralDashboardSummary = DashboardPageData["referralSummary"];

type DashboardReferralCardProps = {
  locale: "fr" | "en";
  summary: ReferralDashboardSummary | null;
  profile: string;
};

export function DashboardReferralCard({
  locale,
  summary,
  profile,
}: DashboardReferralCardProps) {
  const invitedUsersCount = summary?.invitedUsersCount ?? 0;
  const hasReferralData = summary !== null;
  const referralLabel = locale === "fr" ? "parrainage" : "referral";
  const referralPlural = locale === "fr" ? "parrainages" : "referrals";
  const referralDescription = hasReferralData
    ? locale === "fr"
      ? "Ce compteur suit les comptes créés depuis votre lien de parrainage persistant."
      : "This counter tracks accounts created from your persistent referral link."
    : locale === "fr"
      ? "Les données de parrainage sont momentanément indisponibles."
      : "Referral data is temporarily unavailable.";

  return (
    <FamilyRubriqueCard
      id="parrainage"
      withTopBar={true}
      topBarContent={locale === "fr" ? "Parrainages" : "Referrals"}
      className="h-full scroll-mt-28 p-7 sm:p-8"
    >
      <div className="flex h-full flex-col justify-between gap-6">
        <div className="space-y-3">
          <p className="cmm-text-caption font-bold uppercase tracking-[0.28em] text-amber-100/72">
            {locale === "fr" ? "Compteur persistant" : "Persistent counter"}
          </p>
          <div className="flex items-end gap-3">
            <span className="text-5xl font-black tracking-tight text-white sm:text-6xl">
              {hasReferralData ? invitedUsersCount : "—"}
            </span>
            {hasReferralData ? (
              <span className="pb-1 text-sm font-bold uppercase tracking-[0.18em] text-amber-100/78">
                {invitedUsersCount <= 1 ? referralLabel : referralPlural}
              </span>
            ) : null}
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-amber-50/80">
            {referralDescription}
          </p>
        </div>

        <DashboardReferralStatusGrid locale={locale} summary={summary} />

        <div className="flex flex-wrap gap-3">
          <CmmButton
            href={buildProfileRoute(profile)}
            tone="secondary"
            variant="pill"
            className="h-11 px-4 cmm-text-small font-black gap-2"
          >
            <ArrowRight size={14} />
            {locale === "fr" ? "Ouvrir le badge" : "Open badge"}
          </CmmButton>
        </div>
      </div>
    </FamilyRubriqueCard>
  );
}

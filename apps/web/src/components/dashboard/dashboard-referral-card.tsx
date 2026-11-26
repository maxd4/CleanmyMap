import { ArrowRight } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { buildProfileRoute } from "@/lib/accueil-pilotage-routes";
import type { DashboardPageData } from "@/lib/dashboard/page-data";
import { DashboardReferralStatusGrid } from "./dashboard-referral-status-grid";

type ReferralDashboardSummary = DashboardPageData["referralSummary"];

type DashboardReferralCardProps = {
  locale: "fr" | "en";
  summary: ReferralDashboardSummary | null;
  profile: string;
};

export function DashboardReferralCard({ locale, summary, profile }: DashboardReferralCardProps) {
  const invitedUsersCount = summary?.invitedUsersCount;
  const fr = locale === "fr";
  const referralLabel = fr ? "parrainage" : "referral";
  const referralPlural = fr ? "parrainages" : "referrals";
  return (
    <section id="parrainage" className="scroll-mt-28" aria-labelledby="dashboard-referral-title">
      <CmmCard className="space-y-4">
        <h3 id="dashboard-referral-title" className="text-lg font-bold cmm-text-primary">{fr ? "Parrainages" : "Referrals"}</h3>
        <div className="space-y-2">
          <p className="text-sm font-semibold cmm-text-secondary">{fr ? "Compteur persistant" : "Persistent counter"}</p>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums cmm-text-primary">{invitedUsersCount ?? "—"}</span>
            {invitedUsersCount !== undefined && (
              <span className="text-sm font-semibold cmm-text-secondary">{invitedUsersCount <= 1 ? referralLabel : referralPlural}</span>
            )}
          </div>
          <p className="text-sm cmm-text-secondary">
            {summary
              ? (fr ? "Comptes créés depuis votre lien de parrainage persistant." : "Accounts created from your persistent referral link.")
              : (fr ? "Les données de parrainage sont momentanément indisponibles." : "Referral data is temporarily unavailable.")}
          </p>
        </div>
        <DashboardReferralStatusGrid locale={locale} summary={summary} />
        <CmmButton href={`${buildProfileRoute(profile)}?tab=referrals#parrainage`} tone="secondary">
          <ArrowRight size={14} aria-hidden="true" />
          {fr ? "Ouvrir le badge" : "Open badge"}
        </CmmButton>
      </CmmCard>
    </section>
  );
}

import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { DashboardReferralCard } from "./dashboard-referral-card";
import { DashboardUserLevelRanking } from "./dashboard-user-level-ranking";
import { loadDashboardEngagementData } from "@/lib/dashboard/page-data";
import { buildProfileRoute } from "@/lib/accueil-pilotage-routes";
import type { AppProfile } from "@/lib/profiles";
import type { Locale } from "@/lib/ui/preferences";

export async function DashboardEngagementPanel({ userId, profile, locale }: { userId: string; profile: AppProfile; locale: Locale }) {
  const { userLevelRanking, referralSummary } = await loadDashboardEngagementData(userId);
  return (
    <section className="space-y-4" aria-labelledby="dashboard-engagement-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="dashboard-engagement-title" className="text-xl font-bold cmm-text-primary">{locale === "fr" ? "Mon engagement" : "My engagement"}</h2>
        <div className="flex flex-wrap gap-2">
          <CmmButton href="/profil/engagement" tone="primary">{locale === "fr" ? "Mon dossier" : "My record"}</CmmButton>
          <CmmButton href="/profil/impact" tone="secondary">{locale === "fr" ? "Mon impact" : "My impact"}</CmmButton>
          <CmmButton href={`${buildProfileRoute(profile)}?tab=badges`} tone="secondary">{locale === "fr" ? "Progression et badges" : "Progress and badges"}</CmmButton>
        </div>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <DashboardReferralCard locale={locale} summary={referralSummary} profile={profile} />
        {userLevelRanking ? <DashboardUserLevelRanking locale={locale} userId={userId} userLevelRanking={userLevelRanking} /> : (
          <CmmCard><p role="status" className="cmm-text-secondary">{locale === "fr" ? "Classement momentanément indisponible." : "Ranking temporarily unavailable."}</p></CmmCard>
        )}
      </div>
    </section>
  );
}

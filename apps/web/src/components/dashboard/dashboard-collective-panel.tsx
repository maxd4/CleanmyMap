import { DashboardOverviewSection } from "./dashboard-overview-section";
import { loadDashboardOverviewResult } from "@/lib/dashboard/page-data";
import { getProfilePrimaryAction, type AppProfile } from "@/lib/profiles";
import type { Locale } from "@/lib/ui/preferences";

export async function DashboardCollectivePanel({ locale, profile }: { locale: Locale; profile: AppProfile }) {
  const overview = await loadDashboardOverviewResult(locale);
  const fr = locale === "fr";
  return (
    <section className="space-y-4" aria-labelledby="dashboard-collective-title">
      <div>
        <h2 id="dashboard-collective-title" className="text-xl font-bold cmm-text-primary">{fr ? "Indicateurs collectifs" : "Collective metrics"}</h2>
        <p className="text-sm cmm-text-secondary">{fr ? "Données publiées de la plateforme, non limitées à votre compte. Comparaison sur 30 jours." : "Published platform data, not limited to your account. 30-day comparison."}</p>
        {overview.status === "ok" && (overview.overview.dataAvailability.isTruncated || overview.overview.dataAvailability.sourceHealth.partial) && (
          <p role="status" className="text-sm font-semibold cmm-text-warning">{fr ? "Source partielle ou tronquée : interprétez les indicateurs avec prudence." : "Partial or truncated source: interpret metrics with care."}</p>
        )}
      </div>
      <DashboardOverviewSection overviewPromise={Promise.resolve(overview)} locale={locale} profile={profile} primaryAction={getProfilePrimaryAction(profile)} />
    </section>
  );
}

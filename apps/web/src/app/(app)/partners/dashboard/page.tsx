import { INITIAL_ANNUAIRE_ENTRIES } from "@/components/sections/rubriques/annuaire-directory-seed";
import {
  CONTRIBUTION_LABELS,
  formatCoverage,
  hasRecentActivity,
  VERIFICATION_LABELS,
} from "@/components/sections/rubriques/annuaire-helpers";
import { countPartnerOnboardingRequests } from "@/lib/partners/onboarding-requests-store";

function topContributionRows() {
  const counter = new Map<string, number>();
  for (const entry of INITIAL_ANNUAIRE_ENTRIES) {
    for (const contribution of entry.contributionTypes) {
      counter.set(contribution, (counter.get(contribution) ?? 0) + 1);
    }
  }
  return [...counter.entries()]
    .map(([key, count]) => ({
      key,
      label: CONTRIBUTION_LABELS[key as keyof typeof CONTRIBUTION_LABELS],
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

export default async function PartnersDashboardPage() {
  const activeEntries = INITIAL_ANNUAIRE_ENTRIES.filter(
    (entry) =>
      entry.qualificationStatus === "partenaire_actif" &&
      entry.verificationStatus === "verifie" &&
      hasRecentActivity(entry.recentActivityAt),
  );
  const staleEntries = INITIAL_ANNUAIRE_ENTRIES.filter(
    (entry) =>
      entry.verificationStatus !== "verifie" || !hasRecentActivity(entry.recentActivityAt),
  );
  let onboardingRequestCount: number | null = null;
  let onboardingLoadError: string | null = null;
  try {
    onboardingRequestCount = await countPartnerOnboardingRequests();
  } catch (error) {
    console.error("Partner onboarding requests load failed", error);
    onboardingLoadError =
      "Demandes onboarding indisponibles (configuration persistance).";
  }
  const contributionRows = topContributionRows();
  const coveredZones = new Set(
    activeEntries.flatMap((entry) => entry.coveredArrondissements),
  );

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Tableau de bord partenaire</h1>
        <p className="mt-1 text-sm text-slate-600">
          Vue synthese contributions, zones, besoins et prochaines actions.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <article className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Acteurs actifs</p>
          <p className="text-xl font-semibold text-slate-900">{activeEntries.length}</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Zones couvertes</p>
          <p className="text-xl font-semibold text-slate-900">{coveredZones.size}</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Demandes onboarding</p>
          <p className="text-xl font-semibold text-slate-900">
            {onboardingRequestCount ?? "n/a"}
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Besoins prioritaires</p>
          <p className="text-xl font-semibold text-slate-900">{staleEntries.length}</p>
        </article>
      </section>

      {onboardingLoadError ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {onboardingLoadError}
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Contributions (réseau)</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {contributionRows.map((row) => (
              <li key={row.key} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2">
                <span>{row.label}</span>
                <span className="font-semibold text-slate-900">{row.count}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Besoins / points d&apos;attention</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {staleEntries.slice(0, 6).map((entry) => (
              <li key={`stale-${entry.id}`} className="rounded bg-amber-50 px-3 py-2 text-amber-900">
                <p className="font-semibold">{entry.name}</p>
                <p className="text-xs">
                  {VERIFICATION_LABELS[entry.verificationStatus]} | zone{" "}
                  {formatCoverage(entry.coveredArrondissements, entry.location)}
                </p>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Prochaines actions</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>Traiter les demandes onboarding en attente sous 72h ouvrées.</li>
          <li>Revalider les fiches marquées &quot;a revalider&quot;.</li>
          <li>Renforcer les contributions en zones sous-couvertes.</li>
          <li>Publier les mises à jour de fiches partenaires cette semaine.</li>
        </ol>
      </section>
    </div>
  );
}

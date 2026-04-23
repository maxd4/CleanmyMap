import { auth } from "@clerk/nextjs/server";
import { INITIAL_ANNUAIRE_ENTRIES } from "@/components/sections/rubriques/annuaire-directory-seed";
import { hasRecentActivity } from "@/components/sections/rubriques/annuaire-helpers";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { PublishedAnnuaireReviewPanel } from "@/components/partners/published-annuaire-review-panel";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { countPartnerOnboardingRequests } from "@/lib/partners/onboarding-requests-store";
import { listPublishedPartnerAnnuaireEntries } from "@/lib/partners/published-annuaire-entries-store";

export default async function PartnersDashboardPage() {
  const { userId } = await auth();
  const publishedEntries = await listPublishedPartnerAnnuaireEntries().catch(() => []);
  const currentRole = userId ? await getCurrentUserRoleLabel().catch(() => null) : null;
  const acceptedPublishedEntries = publishedEntries.filter(
    (entry) => entry.publicationStatus === "accepted",
  );
  const reviewPublishedEntries = publishedEntries.filter(
    (entry) => entry.publicationStatus !== "accepted",
  );
  const allEntries = (() => {
    const seen = new Set<string>();
    const output = [...INITIAL_ANNUAIRE_ENTRIES.slice(0, 0)];
    for (const entry of [...INITIAL_ANNUAIRE_ENTRIES, ...acceptedPublishedEntries]) {
      const key = `${entry.name.trim().toLowerCase()}::${entry.legalIdentity.trim().toLowerCase()}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      output.push(entry);
    }
    return output;
  })();
  const totalEntries = allEntries.length;
  const activeEntries = allEntries.filter(
    (entry) =>
      entry.qualificationStatus === "partenaire_actif" &&
      entry.verificationStatus === "verifie" &&
      hasRecentActivity(entry.recentActivityAt),
  );
  const staleEntries = allEntries.filter(
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
  const coveredZones = new Set(allEntries.flatMap((entry) => entry.coveredArrondissements));

  const page = (
    <div className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Décision / supervision
        </p>
        <h1 className="mt-1 text-lg font-semibold text-slate-900">Tableau de bord partenaires</h1>
        <p className="mt-1 text-sm text-slate-600">
          Vue de pilotage: arbitrer, valider et suivre les demandes.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <article className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Fiches publiées</p>
          <p className="text-xl font-semibold text-slate-900">{totalEntries}</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Partenaires actifs</p>
          <p className="text-xl font-semibold text-slate-900">{activeEntries.length}</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Zones couvertes</p>
          <p className="text-xl font-semibold text-slate-900">{coveredZones.size}</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Demandes en attente</p>
          <p className="text-xl font-semibold text-slate-900">
            {onboardingRequestCount ?? "n/a"}
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Fiches à revoir</p>
          <p className="text-xl font-semibold text-slate-900">{reviewPublishedEntries.length}</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-3 md:col-span-2">
          <p className="text-xs text-slate-500">Fiches à confirmer</p>
          <p className="text-xl font-semibold text-slate-900">{staleEntries.length}</p>
        </article>
      </section>

      {onboardingLoadError ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {onboardingLoadError}
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Prochaines décisions</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>Traiter les demandes de partenariat en attente sous 72h ouvrées.</li>
          <li>Revoir les fiches publiées en attente d&apos;acceptation ou de rejet.</li>
          <li>Renforcer les contributions en zones sous-couvertes.</li>
          <li>Publier les mises à jour de fiches partenaires cette semaine.</li>
        </ol>
      </section>

      {currentRole === "admin" && reviewPublishedEntries.length > 0 ? (
        <PublishedAnnuaireReviewPanel items={reviewPublishedEntries} />
      ) : null}
    </div>
  );

  return (
    <ClerkRequiredGate
      isAuthenticated={Boolean(userId)}
      mode="disabled"
      title="Tableau de bord du réseau"
      description="Cette vue reste lisible, mais les actions sont réservées aux comptes connectés."
    >
      {page}
    </ClerkRequiredGate>
  );
}

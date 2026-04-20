"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPin } from "lucide-react";
import {
  PARIS_ARRONDISSEMENTS,
  distanceToParisArrondissementKm,
  getParisArrondissementLabel,
  type ParisArrondissement,
} from "@/lib/geo/paris-arrondissements";
import { extractUserLocationPreferenceFromMetadata } from "@/lib/user-location-preference";
import { INITIAL_ANNUAIRE_ENTRIES } from "./annuaire-directory-seed";
import { AnnuaireGovernancePanel } from "./annuaire-governance-panel";
import { AnnuaireActorCard } from "./annuaire-actor-card";
import { DiscussionBugReportForm } from "./discussion-bug-report-form";
import { DiscussionBadgesPanel } from "./discussion-badges-panel";
import {
  ACTOR_CARDS_PAGE_SIZE,
  CONTRIBUTION_FILTERS,
  KIND_FILTERS,
  type ContributionType,
  type EntityKind,
  type ZoneFilter,
} from "./annuaire-filters";
import {
  buildDashboardStats,
  VERIFICATION_LABELS,
  buildAutomaticRecommendations,
  hasRecentActivity,
  isNearbyEntry,
  sanitizeRole,
  type EnrichedAnnuaireEntry,
} from "./annuaire-helpers";

const AnnuaireMapCanvas = dynamic(
  () => import("./annuaire-map-canvas").then((mod) => mod.AnnuaireMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] w-full animate-pulse rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
        Chargement de la carte...
      </div>
    ),
  },
);

export function AnnuaireSection() {
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterKind, setFilterKind] = useState<EntityKind | "all">("all");
  const [filterContribution, setFilterContribution] = useState<
    ContributionType | "all"
  >("all");
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>("all");
  const [highlightedActorId, setHighlightedActorId] = useState<string | null>(null);
  const [actorCardsPage, setActorCardsPage] = useState(1);

  const locationPreference = extractUserLocationPreferenceFromMetadata(
    user?.unsafeMetadata as Record<string, unknown> | undefined,
  );
  const targetArrondissement = locationPreference?.arrondissement ?? null;
  const currentProfile = sanitizeRole(user?.publicMetadata?.role);
  const showInternalContact = currentProfile === "admin" || currentProfile === "elu";

  const activeQualifiedEntries = INITIAL_ANNUAIRE_ENTRIES.filter(
    (entry) =>
      entry.qualificationStatus === "partenaire_actif" &&
      entry.verificationStatus === "verifie" &&
      hasRecentActivity(entry.recentActivityAt),
  );

  const pendingOrUnqualifiedEntries = INITIAL_ANNUAIRE_ENTRIES.filter(
    (entry) =>
      entry.qualificationStatus !== "partenaire_actif" ||
      entry.verificationStatus !== "verifie" ||
      !hasRecentActivity(entry.recentActivityAt),
  );

  const sortedAndFilteredEntries: EnrichedAnnuaireEntry[] = (() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const entriesWithDistance: EnrichedAnnuaireEntry[] = activeQualifiedEntries.map(
      (entry) => ({
        ...entry,
        distanceKm: targetArrondissement
          ? distanceToParisArrondissementKm(
              entry.lat,
              entry.lng,
              targetArrondissement,
            )
          : null,
      }),
    );

    const filtered = entriesWithDistance.filter((entry) => {
      const matchSearch =
        normalizedSearch.length === 0 ||
        entry.name.toLowerCase().includes(normalizedSearch) ||
        entry.legalIdentity.toLowerCase().includes(normalizedSearch) ||
        entry.description.toLowerCase().includes(normalizedSearch);
      const matchKind = filterKind === "all" || entry.kind === filterKind;
      const matchContribution =
        filterContribution === "all" ||
        entry.contributionTypes.includes(filterContribution);
      const matchZone =
        zoneFilter === "all" ||
        (zoneFilter === "nearby"
          ? isNearbyEntry(entry, targetArrondissement, entry.distanceKm)
          : entry.coveredArrondissements.includes(zoneFilter));

      return matchSearch && matchKind && matchContribution && matchZone;
    });

    const isDecideur = currentProfile === "elu" || currentProfile === "admin";

      return filtered.sort((a, b) => {
        if (a.distanceKm !== null && b.distanceKm !== null) {
          if (Math.abs(a.distanceKm - b.distanceKm) > 0.05) {
            return a.distanceKm - b.distanceKm;
        }
      }

        if (isDecideur) {
          const aIsBusiness = a.kind === "commerce" || a.kind === "entreprise";
          const bIsBusiness = b.kind === "commerce" || b.kind === "entreprise";
          if (aIsBusiness && !bIsBusiness) return -1;
          if (bIsBusiness && !aIsBusiness) return 1;
        } else {
          if (a.kind === "association" && b.kind !== "association") return -1;
          if (b.kind === "association" && a.kind !== "association") return 1;
        }

        return a.name.localeCompare(b.name, "fr");
      });
  })();
  const actorCardsTotalPages = Math.max(
    1,
    Math.ceil(sortedAndFilteredEntries.length / ACTOR_CARDS_PAGE_SIZE),
  );
  const safeActorCardsPage = Math.min(actorCardsPage, actorCardsTotalPages);
  const actorCardsStart = (safeActorCardsPage - 1) * ACTOR_CARDS_PAGE_SIZE;
  const paginatedActorCards = sortedAndFilteredEntries.slice(
    actorCardsStart,
    actorCardsStart + ACTOR_CARDS_PAGE_SIZE,
  );

  const recommendations = buildAutomaticRecommendations({
    entries: sortedAndFilteredEntries,
    profile: currentProfile,
    arrondissement: targetArrondissement,
  });

  const mostRecentlyUpdatedEntries = [...sortedAndFilteredEntries]
    .sort((a, b) => b.lastUpdatedAt.localeCompare(a.lastUpdatedAt))
    .slice(0, 4);

  const nearbyEntries = (() => {
    if (!targetArrondissement) {
      return [] as EnrichedAnnuaireEntry[];
    }
    return [...sortedAndFilteredEntries]
      .filter((entry) =>
        isNearbyEntry(entry, targetArrondissement, entry.distanceKm),
      )
      .slice(0, 4);
  })();

  const dashboardStats = buildDashboardStats(
    activeQualifiedEntries,
    pendingOrUnqualifiedEntries.length,
  );

  const handleFocusMap = (entryId: string) => {
    setHighlightedActorId(entryId);
    const mapAnchor = document.getElementById("annuaire-map-anchor");
    mapAnchor?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 items-start">
      {/* GAUCHE : Annuaire Explorer (Filtres, Carte, Acteurs) */}
      <div className="space-y-6">
        {locationPreference ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm">
            Priorisation de proximite active:{" "}
            <span className="font-semibold">
              {getParisArrondissementLabel(locationPreference.arrondissement)}
            </span>{" "}
            ({locationPreference.locationType === "work" ? "travail" : "residence"}).
          </div>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700">Recherche</span>
              <input
                value={searchTerm}
                onChange={(event) => {
                  setActorCardsPage(1);
                  setSearchTerm(event.target.value);
                }}
                placeholder="Nom, identite legale, mot-cle..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 transition focus:border-emerald-500 focus:outline-none"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700">Distance / zone</span>
              <select
                value={String(zoneFilter)}
                onChange={(event) => {
                  const raw = event.target.value;
                  if (raw === "all" || raw === "nearby") {
                    setActorCardsPage(1);
                    setZoneFilter(raw);
                    return;
                  }
                  setActorCardsPage(1);
                  setZoneFilter(Number.parseInt(raw, 10) as ParisArrondissement);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 transition focus:border-emerald-500 focus:outline-none"
              >
                <option value="all">Tout Paris</option>
                {targetArrondissement ? <option value="nearby">Proches de moi</option> : null}
                {PARIS_ARRONDISSEMENTS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700">Type d&apos;acteur</span>
              <div className="flex flex-wrap gap-2">
                {KIND_FILTERS.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      setActorCardsPage(1);
                      setFilterKind(item.value);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                      filterKind === item.value
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700">
                Type d&apos;aide proposee
              </span>
              <select
                value={filterContribution}
                onChange={(event) =>
                  {
                    setActorCardsPage(1);
                    setFilterContribution(event.target.value as ContributionType | "all");
                  }
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 transition focus:border-emerald-500 focus:outline-none"
              >
                {CONTRIBUTION_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 shadow-sm flex items-center justify-between">
          <span>Reseau local actif: partenaires verifies avec activite recente uniquement.</span>
          <span className="font-semibold px-2 py-1 bg-sky-100 rounded text-xs">{pendingOrUnqualifiedEntries.length} à requalifier</span>
        </div>

        {sortedAndFilteredEntries.length === 0 ? (
          <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
            <p className="text-sm font-semibold text-amber-900">
              Aucun acteur ne correspond a vos filtres.
            </p>
            <p className="mt-1 text-xs text-amber-900">
              Proposez un nouvel acteur engage ou etendez la zone de recherche.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/partners/onboarding"
                className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 shadow-sm"
              >
                Ajouter un acteur engage
              </Link>
              <button
                onClick={() => setZoneFilter("all")}
                className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 shadow-sm"
              >
                Etendre a tout Paris
              </button>
            </div>
          </section>
        ) : null}

        <div
          id="annuaire-map-anchor"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm relative"
        >
          <div className="absolute top-4 right-4 z-10 pointer-events-none">
            <span className="rounded-full bg-slate-900 text-white px-3 py-1 font-semibold text-xs shadow-md">
              {sortedAndFilteredEntries.length} résultats
            </span>
          </div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MapPin size={16} className="text-emerald-600" />
            Carte + impact par acteur
          </h3>
          <AnnuaireMapCanvas
            items={sortedAndFilteredEntries}
            highlightedItemId={highlightedActorId}
          />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-3">
            Fiches compactes, scannables en quelques secondes
          </h3>
          <div className="space-y-3">
            {paginatedActorCards.map((entry) => (
              <AnnuaireActorCard
                key={entry.id}
                entry={entry}
                onFocusMap={handleFocusMap}
                showInternalContact={showInternalContact}
              />
            ))}
          </div>
          {sortedAndFilteredEntries.length > ACTOR_CARDS_PAGE_SIZE ? (
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-200 pt-3">
              <p className="text-xs text-slate-600 font-medium">
                Page {safeActorCardsPage}/{actorCardsTotalPages} ({sortedAndFilteredEntries.length} fiches)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActorCardsPage((current) => Math.max(1, current - 1))}
                  disabled={safeActorCardsPage <= 1}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Précédent
                </button>
                <button
                  onClick={() =>
                    setActorCardsPage((current) =>
                      Math.min(actorCardsTotalPages, current + 1),
                    )
                  }
                  disabled={safeActorCardsPage >= actorCardsTotalPages}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Suivant
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {/* DROITE : Communication, Contributions et Dashboard */}
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Discussion locale et entraide operationnelle
          </h2>
          <p className="mt-1 text-xs text-slate-700 mb-3">
            Espace de communication entre benevoles, associations, commercants et
            entreprises pour accelerer l&apos;entraide locale, coordonner les actions
            concretes et partager l&apos;actualite terrain.
          </p>
          <DiscussionBadgesPanel />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            Signaler un bug ou une idee
          </h2>
          <DiscussionBugReportForm />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">
            Tableau de bord partenaire
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded bg-slate-50 p-2 border border-slate-100">
              <p className="text-slate-500">Acteurs actifs</p>
              <p className="text-base font-semibold text-slate-900">{dashboardStats.actors}</p>
            </div>
            <div className="rounded bg-slate-50 p-2 border border-slate-100">
              <p className="text-slate-500">Zones couvertes</p>
              <p className="text-base font-semibold text-slate-900">{dashboardStats.zones}</p>
            </div>
            <div className="rounded bg-slate-50 p-2 border border-slate-100">
              <p className="text-slate-500">Contributions</p>
              <p className="text-base font-semibold text-slate-900">
                {dashboardStats.contributions}
              </p>
            </div>
            <div className="rounded bg-slate-50 p-2 border border-slate-100">
              <p className="text-slate-500">Demandes en attente</p>
              <p className="text-base font-semibold text-slate-900">{dashboardStats.pending}</p>
            </div>
          </div>
          <Link
            href="/partners/dashboard"
            className="mt-3 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 transition hover:bg-slate-100 shadow-sm"
          >
            Ouvrir le dashboard complet
          </Link>
        </section>
        
        {recommendations.length > 0 ? (
          <section className="rounded-2xl border border-indigo-200 bg-indigo-50 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-indigo-900">
              Recommandations automatiques (profil + localisation)
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-indigo-900">
              {recommendations.map((item) => (
                <li key={`reco-${item.entry.id}`} className="rounded-lg bg-white/70 p-2 shadow-sm border border-indigo-100">
                  <p className="font-semibold">{item.entry.name}</p>
                  <p>{item.reason}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <AnnuaireGovernancePanel
          pendingEntries={pendingOrUnqualifiedEntries}
          verificationLabels={VERIFICATION_LABELS}
        />
      </div>
    </div>>
  );
}

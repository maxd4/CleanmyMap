"use client";

import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import Link from "next/link";
import useSWR from "swr";
import { MapPin } from "lucide-react";
import {
  PARIS_ARRONDISSEMENTS,
  distanceToParisArrondissementKm,
  getParisArrondissementLabel,
  type ParisArrondissement,
} from "@/lib/geo/paris-arrondissements";
import { extractUserLocationPreferenceFromMetadata } from "@/lib/user-location-preference";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { AcademieClimatWorkshopsPanel } from "./academie-climat-workshops-panel";
import { INITIAL_ANNUAIRE_ENTRIES } from "./annuaire-directory-seed";
import { AnnuaireActorCard } from "./annuaire-actor-card";
import type { AnnuaireEntry } from "./annuaire-map-canvas";
import {
  ACTOR_CARDS_PAGE_SIZE,
  CONTRIBUTION_FILTERS,
  KIND_FILTERS,
  type ContributionType,
  type EntityKind,
  type ZoneFilter,
} from "./annuaire-filters";
import {
  getEntryTrustState,
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
        Loading map...
      </div>
    ),
  },
);

type PublishedDirectoryResponse = {
  status: "ok";
  items: AnnuaireEntry[];
};

export function AnnuaireSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterKind, setFilterKind] = useState<EntityKind | "all">("all");
  const [filterContribution, setFilterContribution] = useState<
    ContributionType | "all"
  >("all");
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>("all");
  const [highlightedActorId, setHighlightedActorId] = useState<string | null>(null);
  const [actorCardsPage, setActorCardsPage] = useState(1);

  const publishedEntriesQuery = useSWR<PublishedDirectoryResponse>(
    "/api/partners/published-directory",
    async (url: string) => {
      const response = await fetch(url, { method: "GET", cache: "no-store" });
      if (!response.ok) {
        throw new Error("published_directory_unavailable");
      }
      return (await response.json()) as PublishedDirectoryResponse;
    },
  );
  const publishedEntries = publishedEntriesQuery.data?.items ?? [];
  const allEntries = useMemo(
    () => {
      const seen = new Set<string>();
      const output: AnnuaireEntry[] = [];
      for (const entry of [...INITIAL_ANNUAIRE_ENTRIES, ...publishedEntries]) {
        const key = `${entry.name.trim().toLowerCase()}::${entry.legalIdentity.trim().toLowerCase()}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        output.push(entry);
      }
      return output;
    },
    [publishedEntries],
  );

  const locationPreference = extractUserLocationPreferenceFromMetadata(
    user?.unsafeMetadata as Record<string, unknown> | undefined,
  );
  const targetArrondissement = locationPreference?.arrondissement ?? null;
  const currentProfile = sanitizeRole(user?.publicMetadata?.role);
  const showInternalContact = currentProfile === "admin" || currentProfile === "elu";

  const sortedAndFilteredEntries: EnrichedAnnuaireEntry[] = (() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const entriesWithDistance: EnrichedAnnuaireEntry[] = allEntries.map(
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

    const trustWeight = (entry: EnrichedAnnuaireEntry) => {
      const trustState = getEntryTrustState(entry);
      if (entry.qualificationStatus === "partenaire_actif" && entry.verificationStatus === "verifie" && hasRecentActivity(entry.recentActivityAt) && trustState === "trusted") {
        return 0;
      }
      if (trustState === "trusted") {
        return 1;
      }
      if (trustState === "pending") {
        return 2;
      }
      return 3;
    };

    return filtered.sort((a, b) => {
      const aIsActive =
        a.qualificationStatus === "partenaire_actif" &&
        a.verificationStatus === "verifie" &&
        hasRecentActivity(a.recentActivityAt);
      const bIsActive =
        b.qualificationStatus === "partenaire_actif" &&
        b.verificationStatus === "verifie" &&
        hasRecentActivity(b.recentActivityAt);
      if (aIsActive !== bIsActive) {
        return aIsActive ? -1 : 1;
      }

      const aTrust = trustWeight(a);
      const bTrust = trustWeight(b);
      if (aTrust !== bTrust) {
        return aTrust - bTrust;
      }

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

  const handleFocusMap = (entryId: string) => {
    setHighlightedActorId(entryId);
    const mapAnchor = document.getElementById("annuaire-map-anchor");
    mapAnchor?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-6">
      <AcademieClimatWorkshopsPanel />

      {locationPreference ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900 shadow-sm">
          {fr ? "Priorisation de proximité active:" : "Active proximity prioritization:"}{" "}
          <span className="font-semibold">
            {getParisArrondissementLabel(locationPreference.arrondissement)}
          </span>{" "}
          ({locationPreference.locationType === "work" ? (fr ? "travail" : "work") : (fr ? "résidence" : "home")}).
        </div>
      ) : null}

      <section className="space-y-3 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
              {fr ? "Découverte" : "Discovery"}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              {fr ? "Chercher et visualiser les partenaires" : "Search and visualize partners"}
            </h2>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-xs text-sky-900 shadow-sm">
            {fr
              ? "La carte et les fiches compactes sont la lecture principale de cette rubrique."
              : "The map and compact cards are the main reading layer for this section."}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-700">{fr ? "Recherche" : "Search"}</span>
            <input
              value={searchTerm}
              onChange={(event) => {
                setActorCardsPage(1);
                setSearchTerm(event.target.value);
              }}
              placeholder={fr ? "Nom, identité légale, mot-clé..." : "Name, legal identity, keyword..."}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 transition focus:border-emerald-500 focus:outline-none"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-700">{fr ? "Distance / zone" : "Distance / area"}</span>
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
              <option value="all">{fr ? "Tout Paris" : "All Paris"}</option>
              {targetArrondissement ? <option value="nearby">{fr ? "Proches de moi" : "Nearby"}</option> : null}
              {PARIS_ARRONDISSEMENTS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-700">{fr ? "Type de structure" : "Structure type"}</span>
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
              {fr ? "Type d&apos;aide proposée" : "Type of help offered"}
            </span>
            <select
              value={filterContribution}
              onChange={(event) => {
                setActorCardsPage(1);
                setFilterContribution(event.target.value as ContributionType | "all");
              }}
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

        {sortedAndFilteredEntries.length === 0 ? (
          <section className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 shadow-sm">
            <p className="text-sm font-semibold text-amber-900">
              {fr ? "Aucune structure ne correspond à vos filtres." : "No structure matches your filters."}
            </p>
            <p className="mt-1 text-xs text-amber-900">
              {fr
                ? "Proposez une nouvelle structure ou étendez la zone de recherche."
                : "Suggest a new structure or widen the search area."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/partners/onboarding"
                className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 shadow-sm"
              >
                {fr ? "Ajouter une structure" : "Add a structure"}
              </Link>
              <button
                onClick={() => setZoneFilter("all")}
                className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 shadow-sm"
              >
                {fr ? "Étendre à tout Paris" : "Expand to all Paris"}
              </button>
            </div>
          </section>
        ) : null}
      </section>

      <section
        id="annuaire-map-anchor"
        className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MapPin size={16} className="text-emerald-600" />
            {fr ? "Carte et impact par structure" : "Map and impact by structure"}
          </h3>
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-md">
            {sortedAndFilteredEntries.length} {fr ? "résultats" : "results"}
          </span>
        </div>
        <AnnuaireMapCanvas
          items={sortedAndFilteredEntries}
          highlightedItemId={highlightedActorId}
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2 mb-3">
          <h3 className="text-sm font-semibold text-slate-900">
            {fr ? "Fiches compactes" : "Compact cards"}
          </h3>
          <p className="text-xs text-slate-600">
            {fr ? "Lisibles en quelques secondes" : "Readable in a few seconds"}
          </p>
        </div>
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
              {fr
                ? `Page ${safeActorCardsPage}/${actorCardsTotalPages} (${sortedAndFilteredEntries.length} fiches)`
                : `Page ${safeActorCardsPage}/${actorCardsTotalPages} (${sortedAndFilteredEntries.length} records)`}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActorCardsPage((current) => Math.max(1, current - 1))}
                disabled={safeActorCardsPage <= 1}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {fr ? "Précédent" : "Previous"}
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
                {fr ? "Suivant" : "Next"}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { useUser } from "@clerk/nextjs";
import { extractUserLocationPreferenceFromMetadata } from "@/lib/user-location-preference";
import { INITIAL_ANNUAIRE_ENTRIES } from "./seed-index";
import { 
  ACTOR_CARDS_PAGE_SIZE, 
  type ContributionType, 
  type EntityKind, 
  type ZoneFilter 
} from "./annuaire-filters";
import {
  compareAnnuaireEntries,
  getAnnuaireDistanceKm,
  isNearbyEntry, 
  isNationalAnnuaireEntry,
  mergeAnnuaireEntries,
  type EnrichedAnnuaireEntry 
} from "./annuaire-helpers";
import type { PublishedAnnuaireEntry } from "@/lib/partners/annuaire-types";

type PublishedDirectoryResponse = {
  status: "ok";
  items: PublishedAnnuaireEntry[];
};

export function useAnnuaireLogic() {
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterKind, setFilterKind] = useState<EntityKind | "all">("all");
  const [filterContribution, setFilterContribution] = useState<ContributionType | "all">("all");
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>("all");
  const [highlightedActorId, setHighlightedActorId] = useState<string | null>(null);
  const [actorCardsPage, setActorCardsPage] = useState(1);

  const publishedEntriesQuery = useSWR<PublishedDirectoryResponse>(
    "/api/partners/published-directory",
    async (url: string) => {
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) throw new Error("published_directory_unavailable");
      return (await response.json()) as PublishedDirectoryResponse;
    }
  );

  const publishedEntries = useMemo(
    () => publishedEntriesQuery.data?.items ?? [],
    [publishedEntriesQuery.data?.items],
  );

  const locationPreference = useMemo(() => 
    extractUserLocationPreferenceFromMetadata(user?.unsafeMetadata as Record<string, unknown> | undefined),
    [user?.unsafeMetadata]
  );

  const targetArrondissement = locationPreference?.arrondissement ?? null;

  const allEntries = useMemo(() => {
    return mergeAnnuaireEntries(INITIAL_ANNUAIRE_ENTRIES, publishedEntries);
  }, [publishedEntries]);

  const enrichedEntries = useMemo(
    () =>
      allEntries.map(
        (entry): EnrichedAnnuaireEntry => ({
          ...entry,
          distanceKm: getAnnuaireDistanceKm(entry, targetArrondissement),
        }),
      ),
    [allEntries, targetArrondissement],
  );

  const featuredEntries = useMemo(
    () => enrichedEntries.filter((entry) => entry.isFeatured),
    [enrichedEntries],
  );

  const sortedAndFilteredEntries = useMemo(() => {
    let result = [...enrichedEntries];

    if (searchTerm) {
      const low = searchTerm.toLowerCase();
      result = result.filter(e => 
        e.name.toLowerCase().includes(low) || 
        e.legalIdentity.toLowerCase().includes(low) ||
        e.description.toLowerCase().includes(low) ||
        e.tags?.some(t => t.toLowerCase().includes(low)) ||
        e.associationProfile?.mission.toLowerCase().includes(low) ||
        e.associationProfile?.recurringNeeds.some((need) => need.toLowerCase().includes(low)) ||
        e.associationProfile?.pastActions.some((action) => action.toLowerCase().includes(low)) ||
        e.associationProfile?.usefulResources.some((resource) =>
          resource.label.toLowerCase().includes(low) ||
          (resource.description?.toLowerCase().includes(low) ?? false),
        )
      );
    }

    if (filterKind !== "all") {
      result = result.filter(e => e.kind === filterKind);
    }

    if (filterContribution !== "all") {
      result = result.filter(e => e.contributionTypes.includes(filterContribution));
    }

    if (zoneFilter === "nearby") {
      result = result.filter(e => isNearbyEntry(e, targetArrondissement, e.distanceKm));
    } else if (typeof zoneFilter === "number") {
      result = result.filter(
        (entry) => !isNationalAnnuaireEntry(entry) && entry.coveredArrondissements.includes(zoneFilter),
      );
    }

    return result.sort(compareAnnuaireEntries);
  }, [enrichedEntries, searchTerm, filterKind, filterContribution, zoneFilter, targetArrondissement]);

  const actorCardsTotalPages = Math.ceil(sortedAndFilteredEntries.length / ACTOR_CARDS_PAGE_SIZE);
  const safeActorCardsPage = Math.min(actorCardsPage, Math.max(1, actorCardsTotalPages));
  
  const paginatedActorCards = useMemo(() => {
    const start = (safeActorCardsPage - 1) * ACTOR_CARDS_PAGE_SIZE;
    return sortedAndFilteredEntries.slice(start, start + ACTOR_CARDS_PAGE_SIZE);
  }, [sortedAndFilteredEntries, safeActorCardsPage]);

  const filterKey = `${searchTerm}|${filterKind}|${filterContribution}|${zoneFilter}`;
  const resetFilters = useCallback(() => {
    setSearchTerm("");
    setFilterKind("all");
    setFilterContribution("all");
    setZoneFilter("all");
    setActorCardsPage(1);
  }, []);

  return {
    searchTerm, setSearchTerm,
    filterKind, setFilterKind,
    filterContribution, setFilterContribution,
    zoneFilter, setZoneFilter,
    highlightedActorId, setHighlightedActorId,
    actorCardsPage, setActorCardsPage,
    locationPreference,
    targetArrondissement,
    allEntries,
    enrichedEntries,
    featuredEntries,
    sortedAndFilteredEntries,
    paginatedEntries: paginatedActorCards,
    totalPages: actorCardsTotalPages,
    safeActorCardsPage,
    filterKey,
    resetFilters,
    locale: "fr",
    isLoading: publishedEntriesQuery.isLoading
  };
}

export type AnnuaireLogic = ReturnType<typeof useAnnuaireLogic>;

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
  matchesAnnuaireSearch,
  mergeAnnuaireEntries,
  tokenizeAnnuaireSearchQuery,
  type EnrichedAnnuaireEntry 
} from "./annuaire-helpers";
import type { PublishedAnnuaireEntry } from "@/lib/partners/annuaire-types";

type PublishedDirectoryResponse = {
  status: "ok";
  items: PublishedAnnuaireEntry[];
};

function usePublishedAnnuaireDirectory() {
  const {
    data: publishedDirectoryData,
    error: publishedDirectoryError,
    isLoading: publishedDirectoryIsLoading,
    isValidating: publishedDirectoryIsValidating,
    mutate: mutatePublishedDirectory,
  } = useSWR<PublishedDirectoryResponse>(
    "/api/partners/published-directory",
    async (url: string) => {
      const response = await fetch(url, { method: "GET", cache: "no-store" });
      if (!response.ok) throw new Error("published_directory_unavailable");
      return (await response.json()) as PublishedDirectoryResponse;
    },
  );
  const retryPublishedDirectory = useCallback(() => {
    void mutatePublishedDirectory();
  }, [mutatePublishedDirectory]);
  return { publishedDirectoryData, publishedDirectoryError, publishedDirectoryIsLoading, publishedDirectoryIsValidating, retryPublishedDirectory };
}

export function useAnnuaireLogic() {
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterKind, setFilterKind] = useState<EntityKind | "all">("all");
  const [filterContribution, setFilterContribution] = useState<ContributionType | "all">("all");
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>("all");
  const [highlightedActorId, setHighlightedActorId] = useState<string | null>(null);
  const [actorCardsPage, setActorCardsPage] = useState(1);
  const updateSearchTerm = useCallback((value: string) => {
    setSearchTerm(value);
    setActorCardsPage(1);
  }, []);

  const { publishedDirectoryData, publishedDirectoryError, publishedDirectoryIsLoading, publishedDirectoryIsValidating, retryPublishedDirectory } = usePublishedAnnuaireDirectory();

  const publishedEntries = useMemo(
    () => publishedDirectoryData?.items ?? [],
    [publishedDirectoryData?.items],
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

  const searchTerms = useMemo(
    () => tokenizeAnnuaireSearchQuery(searchTerm),
    [searchTerm],
  );

  const sortedAndFilteredEntries = useMemo(() => {
    let result = [...enrichedEntries];

    if (searchTerms.length > 0) {
      result = result.filter((entry) => matchesAnnuaireSearch(entry, searchTerms));
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
  }, [enrichedEntries, searchTerms, filterKind, filterContribution, zoneFilter, targetArrondissement]);

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
    searchTerm, setSearchTerm: updateSearchTerm,
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
    isLoading: publishedDirectoryIsLoading,
    isValidating: publishedDirectoryIsValidating,
    publishedDirectoryError: publishedDirectoryError ?? null,
    isPublishedDirectoryUnavailable: Boolean(publishedDirectoryError),
    isPublishedDirectoryStale: Boolean(
      publishedDirectoryError && publishedDirectoryData,
    ),
    retryPublishedDirectory,
  };
}

export type AnnuaireLogic = ReturnType<typeof useAnnuaireLogic>;

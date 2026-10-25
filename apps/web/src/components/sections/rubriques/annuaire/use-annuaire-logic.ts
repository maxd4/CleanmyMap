import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { useUser } from "@clerk/nextjs";
import { extractUserLocationPreferenceFromMetadata } from "@/lib/user-location-preference";
import { INITIAL_ANNUAIRE_ENTRIES } from "./seed-index";
import { 
  ACTOR_CARDS_PAGE_SIZE, 
  type ContributionType, 
  type EngagementDomainFilter,
  type EntityKind, 
  type ZoneFilter 
} from "./annuaire-filters";
import {
  compareAnnuaireEntries,
  getAnnuaireDistanceKm,
  isNearbyEntry, 
  isNationalAnnuaireEntry,
  matchesAnnuaireEngagementDomain,
  matchesAnnuaireSearch,
  mergeAnnuaireEntries,
  tokenizeAnnuaireSearchQuery,
  type EnrichedAnnuaireEntry 
} from "./annuaire-helpers";
import { isPublishedAnnuaireEntry, type PublishedAnnuaireEntry } from "@/lib/partners/annuaire-types";

type PublishedDirectoryResponse = {
  status: "ok";
  items: PublishedAnnuaireEntry[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function usePublishedAnnuaireDirectory() {
  const {
    data: publishedDirectoryData,
    error: publishedDirectoryError,
    isLoading: publishedDirectoryIsLoading,
    isValidating: publishedDirectoryIsValidating,
    mutate: mutatePublishedDirectory,
  } = useSWR<PublishedDirectoryResponse, unknown>(
    "/api/partners/published-directory",
    async (url: string): Promise<PublishedDirectoryResponse> => {
      const response = await fetch(url, { method: "GET", cache: "no-store" });
      if (!response.ok) throw new Error("published_directory_unavailable");
      const body: unknown = await response.json().catch(() => null);
      if (!isRecord(body) || body.status !== "ok" || !Array.isArray(body.items) || !body.items.every(isPublishedAnnuaireEntry)) {
        throw new Error("published_directory_invalid");
      }
      return { status: "ok", items: body.items.filter(isPublishedAnnuaireEntry) };
    },
  );
  const retryPublishedDirectory = useCallback(() => {
    void mutatePublishedDirectory().catch(() => undefined);
  }, [mutatePublishedDirectory]);
  return { publishedDirectoryData, publishedDirectoryError, publishedDirectoryIsLoading, publishedDirectoryIsValidating, retryPublishedDirectory };
}

export function useAnnuaireLogic() {
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterKind, setFilterKind] = useState<EntityKind | "all">("all");
  const [filterContribution, setFilterContribution] = useState<ContributionType | "all">("all");
  const [engagementDomain, setEngagementDomain] = useState<EngagementDomainFilter>("all");
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>("all");
  const [highlightedActorId, setHighlightedActorId] = useState<string | null>(null);
  const [actorCardsPage, setActorCardsPage] = useState(1);
  const updateSearchTerm = useCallback((value: string) => {
    setSearchTerm(value);
    setActorCardsPage(1);
  }, []);
  const updateEngagementDomain = useCallback((value: EngagementDomainFilter) => {
    setEngagementDomain(value);
    setActorCardsPage(1);
  }, []);

  const { publishedDirectoryData, publishedDirectoryError, publishedDirectoryIsLoading, publishedDirectoryIsValidating, retryPublishedDirectory } = usePublishedAnnuaireDirectory();

  const publishedEntries = useMemo(
    () => publishedDirectoryData?.items ?? [],
    [publishedDirectoryData?.items],
  );

  const locationPreference = useMemo(() => 
    extractUserLocationPreferenceFromMetadata(user?.unsafeMetadata),
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

    if (engagementDomain !== "all") {
      result = result.filter((entry) =>
        matchesAnnuaireEngagementDomain(entry, engagementDomain),
      );
    }

    if (zoneFilter === "nearby") {
      result = result.filter(e => isNearbyEntry(e, targetArrondissement, e.distanceKm));
    } else if (typeof zoneFilter === "number") {
      result = result.filter(
        (entry) => !isNationalAnnuaireEntry(entry) && entry.coveredArrondissements.includes(zoneFilter),
      );
    }

    return result.sort(compareAnnuaireEntries);
  }, [enrichedEntries, searchTerms, filterKind, filterContribution, engagementDomain, zoneFilter, targetArrondissement]);

  const actorCardsTotalPages = Math.ceil(sortedAndFilteredEntries.length / ACTOR_CARDS_PAGE_SIZE);
  const safeActorCardsPage = Math.min(actorCardsPage, Math.max(1, actorCardsTotalPages));
  
  const paginatedActorCards = useMemo(() => {
    const start = (safeActorCardsPage - 1) * ACTOR_CARDS_PAGE_SIZE;
    return sortedAndFilteredEntries.slice(start, start + ACTOR_CARDS_PAGE_SIZE);
  }, [sortedAndFilteredEntries, safeActorCardsPage]);

  const filterKey = `${searchTerm}|${filterKind}|${filterContribution}|${zoneFilter}|${engagementDomain}`;
  const resetFilters = useCallback(() => {
    setSearchTerm("");
    setFilterKind("all");
    setFilterContribution("all");
    setEngagementDomain("all");
    setZoneFilter("all");
    setActorCardsPage(1);
  }, []);

  return {
    searchTerm, setSearchTerm: updateSearchTerm,
    filterKind, setFilterKind,
    filterContribution, setFilterContribution,
    engagementDomain, setEngagementDomain: updateEngagementDomain,
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

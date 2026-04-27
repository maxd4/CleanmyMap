import { useMemo, useState } from "react";
import useSWR from "swr";
import { useUser } from "@clerk/nextjs";
import { extractUserLocationPreferenceFromMetadata } from "@/lib/user-location-preference";
import { 
  distanceToParisArrondissementKm, 
  type ParisArrondissement 
} from "@/lib/geo/paris-arrondissements";
import { INITIAL_ANNUAIRE_ENTRIES } from "./annuaire-directory-seed";
import { 
  ACTOR_CARDS_PAGE_SIZE, 
  type ContributionType, 
  type EntityKind, 
  type ZoneFilter 
} from "./annuaire-filters";
import { 
  getEntryTrustState, 
  isNearbyEntry, 
  type EnrichedAnnuaireEntry 
} from "./annuaire-helpers";
import type { AnnuaireEntry } from "./annuaire-map-canvas";

type PublishedDirectoryResponse = {
  status: "ok";
  items: AnnuaireEntry[];
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
      const response = await fetch(url, { method: "GET", cache: "no-store" });
      if (!response.ok) throw new Error("published_directory_unavailable");
      return (await response.json()) as PublishedDirectoryResponse;
    }
  );

  const publishedEntries = publishedEntriesQuery.data?.items ?? [];

  const locationPreference = useMemo(() => 
    extractUserLocationPreferenceFromMetadata(user?.unsafeMetadata as Record<string, unknown> | undefined),
    [user?.unsafeMetadata]
  );

  const targetArrondissement = locationPreference?.arrondissement ?? null;

  const allEntries = useMemo(() => {
    const seen = new Set<string>();
    const output: AnnuaireEntry[] = [];
    const raw = [...INITIAL_ANNUAIRE_ENTRIES, ...publishedEntries];
    
    for (const entry of raw) {
      const key = `${entry.name.trim().toLowerCase()}::${entry.legalIdentity.trim().toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      output.push(entry);
    }
    return output;
  }, [publishedEntries]);

  const featuredEntries = useMemo(() => 
    allEntries.filter(e => e.isFeatured).map(e => ({
      ...e,
      distanceKm: targetArrondissement 
        ? distanceToParisArrondissementKm(e.arrondissement, targetArrondissement)
        : null
    }))
  , [allEntries, targetArrondissement]);

  const sortedAndFilteredEntries = useMemo(() => {
    let result = allEntries.map((entry): EnrichedAnnuaireEntry => {
      const distance = targetArrondissement 
        ? distanceToParisArrondissementKm(entry.arrondissement, targetArrondissement)
        : null;
      return { ...entry, distanceKm: distance };
    });

    if (searchTerm) {
      const low = searchTerm.toLowerCase();
      result = result.filter(e => 
        e.name.toLowerCase().includes(low) || 
        e.legalIdentity.toLowerCase().includes(low) ||
        e.description.toLowerCase().includes(low) ||
        e.tags?.some(t => t.toLowerCase().includes(low))
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
      result = result.filter(e => e.arrondissement === zoneFilter);
    }

    return result.sort((a, b) => {
      // Prioritize featured in the main list too if they are not already separated
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;

      const trustA = getEntryTrustState(a);
      const trustB = getEntryTrustState(b);
      if (trustA === "trusted" && trustB !== "trusted") return -1;
      if (trustA !== "trusted" && trustB === "trusted") return 1;
      
      if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
      if (a.distanceKm !== null) return -1;
      if (b.distanceKm !== null) return 1;
      
      return a.name.localeCompare(b.name);
    });
  }, [allEntries, searchTerm, filterKind, filterContribution, zoneFilter, targetArrondissement]);

  const actorCardsTotalPages = Math.ceil(sortedAndFilteredEntries.length / ACTOR_CARDS_PAGE_SIZE);
  const safeActorCardsPage = Math.min(actorCardsPage, Math.max(1, actorCardsTotalPages));
  
  const paginatedActorCards = useMemo(() => {
    const start = (safeActorCardsPage - 1) * ACTOR_CARDS_PAGE_SIZE;
    return sortedAndFilteredEntries.slice(start, start + ACTOR_CARDS_PAGE_SIZE);
  }, [sortedAndFilteredEntries, safeActorCardsPage]);

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
    featuredEntries,
    sortedAndFilteredEntries,
    paginatedActorCards,
    actorCardsTotalPages,
    safeActorCardsPage,
    isLoading: publishedEntriesQuery.isLoading
  };
}

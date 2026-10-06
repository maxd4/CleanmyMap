"use client";

import { useMemo, useRef, useState } from "react";
import { INITIAL_ANNUAIRE_ENTRIES } from "@/components/sections/rubriques/annuaire/seed-index";
import {
  buildPartnersNetworkEntriesModel,
  type DomainFilter,
  type PartnerKindFilter,
  type TerritoryFilter,
} from "./partners-network-section.model";
import { PartnersNetworkFilters } from "./partners-network-filters";
import { PartnersNetworkResults } from "./partners-network-results";

export function PartnersNetworkDirectory({ fr }: { fr: boolean }) {
  const entries = INITIAL_ANNUAIRE_ENTRIES;
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<PartnerKindFilter>("all");
  const [domainFilter, setDomainFilter] = useState<DomainFilter>("all");
  const [zoneFilter, setZoneFilter] = useState<TerritoryFilter>("all");
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const { filteredEntries, visibleEntries } = useMemo(
    () =>
      buildPartnersNetworkEntriesModel({
        entries,
        query,
        kindFilter,
        domainFilter,
        territoryFilter: zoneFilter,
      }),
    [domainFilter, entries, kindFilter, query, zoneFilter],
  );

  const handleSearch = () => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleReset = () => {
    setQuery("");
    setKindFilter("all");
    setDomainFilter("all");
    setZoneFilter("all");
  };

  return (
    <div
      ref={resultsRef}
      className="rounded-3xl border border-pink-100 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-black text-slate-950">
            {fr ? "Rechercher dans le référentiel" : "Search the directory"}
          </h2>
          <p className="mt-2 text-base leading-[1.7] text-slate-800">
            {fr
              ? "Filtrez par type, territoire ou domaine d'action."
              : "Filter by type, territory or field of action."}
          </p>
        </div>

        <PartnersNetworkFilters
          fr={fr}
          query={query}
          kindFilter={kindFilter}
          domainFilter={domainFilter}
          zoneFilter={zoneFilter}
          onQueryChange={setQuery}
          onKindChange={setKindFilter}
          onDomainChange={setDomainFilter}
          onZoneChange={setZoneFilter}
          onSearch={handleSearch}
        />

        <PartnersNetworkResults
          filteredEntries={filteredEntries}
          visibleEntries={visibleEntries}
          fr={fr}
          onReset={handleReset}
        />
      </div>
    </div>
  );
}

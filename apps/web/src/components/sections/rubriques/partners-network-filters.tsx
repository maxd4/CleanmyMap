import { ArrowRight, Search } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { DomainFilter, PartnerKindFilter, TerritoryFilter } from "./partners-network-section.model";
import { PartnersNetworkFilterSelects } from "./partners-network-filter-selects";

type PartnersNetworkFiltersProps = {
  fr: boolean;
  query: string;
  kindFilter: PartnerKindFilter;
  domainFilter: DomainFilter;
  zoneFilter: TerritoryFilter;
  onQueryChange: (value: string) => void;
  onKindChange: (value: PartnerKindFilter) => void;
  onDomainChange: (value: DomainFilter) => void;
  onZoneChange: (value: TerritoryFilter) => void;
  onSearch: () => void;
};

export function PartnersNetworkFilters({
  fr,
  query,
  kindFilter,
  domainFilter,
  zoneFilter,
  onQueryChange,
  onKindChange,
  onDomainChange,
  onZoneChange,
  onSearch,
}: PartnersNetworkFiltersProps) {
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]">
      <label className="space-y-2 xl:col-span-5">
        <span className="cmm-text-small font-semibold text-slate-700">
          {fr ? "Rechercher" : "Search"}
        </span>
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-pink-500"
          />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={fr ? "Rechercher un partenaire..." : "Search a partner..."}
            className="h-12 w-full rounded-2xl border border-pink-200 bg-white px-4 pl-11 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
          />
        </div>
      </label>

      <PartnersNetworkFilterSelects
        fr={fr}
        kindFilter={kindFilter}
        domainFilter={domainFilter}
        zoneFilter={zoneFilter}
        onKindChange={onKindChange}
        onDomainChange={onDomainChange}
        onZoneChange={onZoneChange}
      />

      <div className="space-y-2">
        <span className="cmm-text-small font-semibold text-transparent" aria-hidden="true">
          {fr ? "Action" : "Action"}
        </span>
        <CmmButton
          type="button"
          tone="primary"
          variant="pill"
          onClick={onSearch}
          className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-pink-600 px-5 cmm-text-small font-semibold text-white shadow-sm"
        >
          {fr ? "Rechercher" : "Search"}
          <ArrowRight size={16} />
        </CmmButton>
      </div>
    </div>
  );
}

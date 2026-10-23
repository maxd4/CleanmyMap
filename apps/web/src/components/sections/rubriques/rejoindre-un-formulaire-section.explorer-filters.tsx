"use client";

import { useState } from "react";
import { ArrowUpDown, CalendarDays, ChevronDown, Filter, MapPin, Search } from "lucide-react";
import type { LocationFilter, PeriodFilter, StatusFilter } from "./rejoindre-un-formulaire-section.controller";
import type { JoinableActionSort } from "./rejoindre-un-formulaire-section.utils";
import { FilterField } from "./rejoindre-un-formulaire-section.shared";

type JoinFormExplorerFiltersProps = {
  fr: boolean;
  hasItems: boolean;
  search: string;
  setSearch: (value: string) => void;
  locationFilter: LocationFilter;
  setLocationFilter: (value: LocationFilter) => void;
  periodFilter: PeriodFilter;
  setPeriodFilter: (value: PeriodFilter) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  sort: JoinableActionSort;
  setSort: (value: JoinableActionSort) => void;
};

export function JoinFormExplorerFilters({ fr, hasItems, search, setSearch, locationFilter, setLocationFilter, periodFilter, setPeriodFilter, statusFilter, setStatusFilter, sort, setSort }: JoinFormExplorerFiltersProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  return <>{hasItems ? (
      <>
        <div className="grid gap-2.5 md:grid-cols-[minmax(0,1fr)_auto_minmax(220px,auto)]">
          <FilterField label={fr ? "Recherche" : "Search"} icon={<Search size={13} />}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={fr ? "Action ou lieu..." : "Action or location..."}
              className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </FilterField>

          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="join-action-filter-panel"
            onClick={() => setFiltersOpen((open) => !open)}
            className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-[1rem] border border-slate-200 bg-white px-4 text-sm font-bold text-emerald-900 shadow-[0_12px_22px_-20px_rgba(15,23,42,0.18)] transition-colors motion-reduce:transition-none hover:border-emerald-300 hover:bg-emerald-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
          >
            <Filter size={14} />
            {fr ? "Filtres" : "Filters"}
            <ChevronDown size={15} className={`transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
          </button>

          <FilterField label={fr ? "Trier" : "Sort"} icon={<ArrowUpDown size={13} />}>
            <div className="relative">
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as JoinableActionSort)}
                className="w-full appearance-none border-0 bg-transparent pr-7 text-sm font-semibold text-slate-900 outline-none"
              >
                <option value="soonest">{fr ? "Date (la plus proche)" : "Date (soonest)"}</option>
                <option value="latest">{fr ? "Date (plus lointaine)" : "Date (latest)"}</option>
                <option value="participants-desc">{fr ? "Plus de bénévoles" : "Most volunteers"}</option>
                <option value="participants-asc">{fr ? "Moins de bénévoles" : "Fewest volunteers"}</option>
                <option value="location-asc">{fr ? "Lieu A → Z" : "Location A → Z"}</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </FilterField>
        </div>

        {filtersOpen ? (
          <div
            id="join-action-filter-panel"
            role="region"
            aria-label={fr ? "Filtres des actions" : "Action filters"}
            className="grid gap-2.5 rounded-[1.1rem] border border-emerald-100 bg-emerald-50/45 p-3 md:grid-cols-3"
          >
            <FilterField label={fr ? "Localisation" : "Location"} icon={<MapPin size={13} />}>
              <div className="relative">
                <select
                  value={locationFilter}
                  onChange={(event) => setLocationFilter(event.target.value as LocationFilter)}
                  className="w-full appearance-none border-0 bg-transparent pr-7 text-sm font-semibold text-slate-900 outline-none"
                >
                  <option value="all">{fr ? "Toutes" : "All"}</option>
                  <option value="ile-de-france">Île-de-France</option>
                  <option value="autres">{fr ? "Autres régions" : "Other regions"}</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </FilterField>

            <FilterField label={fr ? "Période" : "Period"} icon={<CalendarDays size={13} />}>
              <div className="relative">
                <select
                  value={periodFilter}
                  onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}
                  className="w-full appearance-none border-0 bg-transparent pr-7 text-sm font-semibold text-slate-900 outline-none"
                >
                  <option value="all">{fr ? "Toutes" : "All"}</option>
                  <option value="seven-days">{fr ? "7 prochains jours" : "Next 7 days"}</option>
                  <option value="thirty-days">{fr ? "30 prochains jours" : "Next 30 days"}</option>
                  <option value="ninety-days">{fr ? "90 prochains jours" : "Next 90 days"}</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </FilterField>

            <FilterField label={fr ? "Statut" : "Status"} icon={<Filter size={13} />}>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  className="w-full appearance-none border-0 bg-transparent pr-7 text-sm font-semibold text-slate-900 outline-none"
                >
                  <option value="all">{fr ? "Tous" : "All"}</option>
                  <option value="open">{fr ? "Ouverte" : "Open"}</option>
                  <option value="pending">{fr ? "En attente" : "Pending"}</option>
                  <option value="closed">{fr ? "Fermée" : "Closed"}</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </FilterField>
          </div>
        ) : null}
      </>
    ) : null}</>;
}

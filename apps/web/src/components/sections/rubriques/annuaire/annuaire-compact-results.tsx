"use client";

import { cn } from "@/lib/utils";
import { AnnuairePagination } from "./annuaire-partner-list";
import { formatAnnuaireCoverage, type EnrichedAnnuaireEntry } from "./annuaire-helpers";
import type { GeoNetworkEntity } from "./annuaire-geo-network.model";

interface AnnuaireCompactResultsProps {
  fr: boolean;
  entries: EnrichedAnnuaireEntry[];
  entities?: GeoNetworkEntity[];
  selectedActorId: string | null;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSelect: (id: string) => void;
}

/** Résultats compacts de la vue Carte : même jeu paginé que la liste, ouvre la fiche. */
export function AnnuaireCompactResults({
  fr,
  entries,
  entities,
  selectedActorId,
  currentPage,
  totalPages,
  onPageChange,
  onSelect,
}: AnnuaireCompactResultsProps) {
  const rows = entities ? entities.map(entity => ({ id: entity.id, name: entity.name, detail: entity.publicAddressLabel ?? entity.indicators.activityScopeLabel })) : entries.map(entry => ({ id: entry.id, name: entry.name, detail: formatAnnuaireCoverage(entry) }));
  return (
    <div className="min-w-0 space-y-3">
      <ul
        aria-label={fr ? "Résultats de l'annuaire" : "Directory results"}
        className="m-0 flex list-none flex-col gap-2 p-0"
      >
        {rows.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              aria-pressed={entry.id === selectedActorId}
              onClick={() => onSelect(entry.id)}
              className={cn(
                "w-full min-w-0 rounded-xl border px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
                entry.id === selectedActorId
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)]",
              )}
            >
              <span className="block truncate text-sm font-semibold cmm-text-primary">
                {entry.name}
              </span>
              <span className="block truncate text-xs cmm-text-secondary">
                {entry.detail}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <AnnuairePagination
        fr={fr}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}

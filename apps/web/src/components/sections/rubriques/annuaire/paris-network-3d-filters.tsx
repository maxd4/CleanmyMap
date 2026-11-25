"use client";

import { RotateCcw } from "lucide-react";
import {
  EQUIPMENT_STATUS_LABELS,
  PARIS_ACTOR_CATEGORY_META,
  PARIS_ECOSYSTEM_ROLE_LABELS,
  PARIS_RELATION_TYPE_META,
  PARTICIPATION_MODALITY_LABELS,
  type EquipmentStatus,
  type ParisActorCategory,
  type ParisEcosystemRole,
  type ParisRelationType,
  type ParticipationModality,
} from "@/lib/partners/paris-cleanwalk-network";
import { CmmButton } from "@/components/ui/cmm-button";
import {
  DEFAULT_PARIS_NETWORK_3D_FILTERS,
  type ParisNetwork3DFilters,
} from "./paris-network-3d.model";

interface ParisNetwork3DFiltersBarProps {
  filters: ParisNetwork3DFilters;
  onChange: (next: ParisNetwork3DFilters) => void;
  actorCount: number;
  relationCount: number;
  fr: boolean;
}

const ARRONDISSEMENTS = Array.from({ length: 20 }, (_, i) => i + 1);

const selectClassName =
  "h-10 w-full rounded-xl border border-violet-300/20 bg-slate-950/70 px-3 text-xs font-bold text-white transition-colors focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30";

export function ParisNetwork3DFiltersBar({
  filters,
  onChange,
  actorCount,
  relationCount,
  fr,
}: ParisNetwork3DFiltersBarProps) {
  const isFiltered =
    filters.category !== "all" ||
    (filters.ecosystemRole && filters.ecosystemRole !== "all") ||
    filters.participation !== "all" ||
    filters.arrondissement !== "all" ||
    filters.equipment !== "all" ||
    filters.relationType !== "all";

  return (
    <div
      className="rounded-2xl border border-violet-300/15 bg-slate-950/50 p-4"
      role="region"
      aria-label={fr ? "Filtres du réseau 3D parisien" : "Paris 3D network filters"}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase tracking-wider text-violet-200/80">
            {fr ? "Type d'acteur" : "Actor type"}
          </span>
          <select
            aria-label={fr ? "Filtrer par type d'acteur" : "Filter by actor type"}
            className={selectClassName}
            value={filters.category}
            onChange={(e) =>
              onChange({
                ...filters,
                category: e.target.value as ParisActorCategory | "all",
              })
            }
          >
            <option value="all">{fr ? "Toutes les familles" : "All families"}</option>
            {(
              Object.entries(PARIS_ACTOR_CATEGORY_META) as [
                ParisActorCategory,
                { label: string },
              ][]
            ).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase tracking-wider text-violet-200/80">
            {fr ? "Arrondissement" : "District"}
          </span>
          <select
            aria-label={fr ? "Filtrer par arrondissement" : "Filter by district"}
            className={selectClassName}
            value={filters.arrondissement === "all" ? "all" : String(filters.arrondissement)}
            onChange={(e) =>
              onChange({
                ...filters,
                arrondissement:
                  e.target.value === "all" ? "all" : Number(e.target.value),
              })
            }
          >
            <option value="all">{fr ? "Tout Paris" : "All Paris"}</option>
            {ARRONDISSEMENTS.map((arr) => (
              <option key={arr} value={String(arr)}>
                {arr === 1 ? "1er" : `${arr}e`} arrondissement
              </option>
            ))}
          </select>
        </label>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-violet-200">
          {fr ? "Autres filtres" : "More filters"}
          {filters.ecosystemRole !== undefined && filters.ecosystemRole !== "all" || filters.participation !== "all" || filters.equipment !== "all" || filters.relationType !== "all" ? (fr ? " · actifs" : " · active") : ""}
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase tracking-wider text-violet-200/80">
            {fr ? "Rôle écosystème" : "Ecosystem role"}
          </span>
          <select
            aria-label={fr ? "Filtrer par rôle écosystème" : "Filter by ecosystem role"}
            className={selectClassName}
            value={filters.ecosystemRole ?? "all"}
            onChange={(e) =>
              onChange({
                ...filters,
                ecosystemRole: e.target.value as ParisEcosystemRole | "all",
              })
            }
          >
            <option value="all">{fr ? "Tous les rôles" : "All roles"}</option>
            {(
              Object.entries(PARIS_ECOSYSTEM_ROLE_LABELS) as [
                ParisEcosystemRole,
                string,
              ][]
            ).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase tracking-wider text-violet-200/80">
            {fr ? "Public mobilisé" : "Audience"}
          </span>
          <select
            aria-label={fr ? "Filtrer par public mobilisé" : "Filter by audience"}
            className={selectClassName}
            value={filters.participation}
            onChange={(e) =>
              onChange({
                ...filters,
                participation: e.target.value as ParticipationModality | "all",
              })
            }
          >
            <option value="all">{fr ? "Tous publics" : "All audiences"}</option>
            {(
              Object.entries(PARTICIPATION_MODALITY_LABELS) as [
                ParticipationModality,
                string,
              ][]
            ).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase tracking-wider text-violet-200/80">
            {fr ? "Matériel" : "Equipment"}
          </span>
          <select
            aria-label={fr ? "Filtrer par disponibilité de matériel" : "Filter by equipment"}
            className={selectClassName}
            value={filters.equipment}
            onChange={(e) =>
              onChange({
                ...filters,
                equipment: e.target.value as EquipmentStatus | "all",
              })
            }
          >
            <option value="all">{fr ? "Tous statuts" : "All statuses"}</option>
            {(
              Object.entries(EQUIPMENT_STATUS_LABELS) as [EquipmentStatus, string][]
            ).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase tracking-wider text-violet-200/80">
            {fr ? "Nature du lien" : "Relation type"}
          </span>
          <select
            aria-label={fr ? "Filtrer par nature du lien" : "Filter by relation type"}
            className={selectClassName}
            value={filters.relationType}
            onChange={(e) =>
              onChange({
                ...filters,
                relationType: e.target.value as ParisRelationType | "all",
              })
            }
          >
            <option value="all">{fr ? "Toutes relations" : "All relations"}</option>
            {(
              Object.entries(PARIS_RELATION_TYPE_META) as [
                ParisRelationType,
                { label: string },
              ][]
            ).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
        </label>
        </div>
      </details>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs text-slate-300">
        <span className="font-bold">
          {actorCount} {fr ? "acteurs affichés" : "actors displayed"} · {relationCount}{" "}
          {fr ? "relations documentées" : "documented relations"}
        </span>
        {isFiltered ? (
          <CmmButton
            type="button"
            tone="tertiary"
            variant="pill"
            size="sm"
            onClick={() => onChange(DEFAULT_PARIS_NETWORK_3D_FILTERS)}
            ariaLabel={fr ? "Réinitialiser les filtres 3D" : "Reset 3D filters"}
            className="inline-flex items-center gap-1.5 text-xs"
          >
            <RotateCcw size={13} aria-hidden="true" />
            {fr ? "Réinitialiser" : "Reset"}
          </CmmButton>
        ) : null}
      </div>
    </div>
  );
}

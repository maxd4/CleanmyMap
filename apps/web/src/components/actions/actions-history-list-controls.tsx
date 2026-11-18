"use client";

import { useState } from "react";
import { FileText, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { CmmBadge } from "@/components/ui/cmm-badge";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmDialog } from "@/components/ui/cmm-dialog";
import { CmmField, CmmInput, CmmSelect } from "@/components/ui/cmm-field";
import { RubriquePdfExportButton } from "@/components/ui/rubrique-pdf-export-button";
import type { ActionQualityGrade, ActionStatus } from "@/lib/actions/types";
import type { HistorySortKey } from "./actions-history-list-query";
import type { ActionsHistoryListQueryModel } from "./use-actions-history-list-query";

type ActionsHistoryListControlsProps = {
  partialSource: boolean | undefined;
  partialSourcesLabel: string;
  query: ActionsHistoryListQueryModel;
  pdfData: Parameters<typeof RubriquePdfExportButton>[0]["data"];
};

const STATUS_TABS: Array<{ value: ActionStatus | "all"; label: string }> = [
  { value: "approved", label: "Approuvé" },
  { value: "pending", label: "En attente" },
  { value: "rejected", label: "Refusé" },
  { value: "all", label: "Tous" },
];

export function ActionsHistoryListControls({
  partialSource,
  partialSourcesLabel,
  query,
  pdfData,
}: ActionsHistoryListControlsProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const {
    error,
    isLoading,
    isValidating,
    reload,
    statusFilter,
    qualityFilter,
    toFixOnly,
    search,
    sortBy,
    items,
    filteredItems,
    approvedFilteredItems,
    hasActiveFilters,
    activeSecondaryFilterCount,
    setStatusFilter,
    setQualityFilter,
    setToFixOnly,
    setSearch,
    setSortBy,
    resetFilters,
  } = query;

  const isFilteredLocally = search.trim().length > 0 && filteredItems.length !== items.length;
  const countLabel = isFilteredLocally
    ? `${filteredItems.length} / ${items.length} affichés`
    : `${filteredItems.length} enregistrement${filteredItems.length > 1 ? "s" : ""}`;

  return (
    <div className="space-y-3">
      {/* Barre principale : recherche + accès rapide statut + actions utilitaires */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:max-w-xs">
            <CmmInput
              type="search"
              aria-label="Rechercher par bénévole ou lieu"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par bénévole ou lieu…"
            />
          </div>

          <div
            role="group"
            aria-label="Filtrer par statut"
            className="flex flex-wrap items-center gap-1.5"
          >
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.value;
              return (
                <CmmButton
                  key={tab.value}
                  type="button"
                  size="sm"
                  variant="pill"
                  tone={active ? "primary" : "secondary"}
                  ariaPressed={active}
                  onClick={() => setStatusFilter(tab.value)}
                >
                  {tab.label}
                </CmmButton>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CmmButton
            type="button"
            size="sm"
            tone="secondary"
            className={filtersOpen || activeSecondaryFilterCount > 0 ? "border-emerald-500 bg-emerald-50 text-emerald-900" : undefined}
            ariaExpanded={filtersOpen}
            ariaControls="history-secondary-filters"
            onClick={() => setFiltersOpen((previous) => !previous)}
          >
            <SlidersHorizontal size={14} aria-hidden="true" />
            <span>Filtres</span>
            {activeSecondaryFilterCount > 0 ? (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-100 px-1.5 cmm-text-caption font-bold text-emerald-900">
                {activeSecondaryFilterCount}
              </span>
            ) : null}
          </CmmButton>

          <CmmButton
            type="button"
            size="sm"
            tone="secondary"
            disabled={isLoading || Boolean(error) || approvedFilteredItems.length === 0}
            onClick={() => setExportOpen(true)}
          >
            <FileText size={14} aria-hidden="true" />
            <span>Exporter PDF</span>
          </CmmButton>

          <CmmButton
            type="button"
            size="sm"
            tone="secondary"
            loading={isValidating}
            ariaLabel="Rafraîchir l’historique"
            onClick={() => {
              void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ reload();
            }}
          >
            <RefreshCw size={14} aria-hidden="true" className={isValidating ? "animate-spin" : ""} />
            <span className="hidden sm:inline">{isValidating ? "Actualisation…" : "Rafraîchir"}</span>
          </CmmButton>
        </div>
      </div>

      {/* Options secondaires repliables */}
      {filtersOpen ? (
        <div
          id="history-secondary-filters"
          className="grid gap-3 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-muted)]/60 p-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <CmmField label="Grade qualité">
            <CmmSelect
              value={qualityFilter}
              onChange={(event) => setQualityFilter(event.target.value as ActionQualityGrade | "all")}
            >
              <option value="all">Tous</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </CmmSelect>
          </CmmField>

          <CmmField label="Trier par">
            <CmmSelect
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as HistorySortKey)}
            >
              <option value="date_desc">Date (plus récent)</option>
              <option value="date_asc">Date (plus ancien)</option>
              <option value="quality_desc">Qualité (meilleure)</option>
              <option value="quality_asc">Qualité (à corriger)</option>
              <option value="waste_desc">Volume déchets (kg ↓)</option>
            </CmmSelect>
          </CmmField>

          <CmmField label="Priorité correction">
            <CmmButton
              type="button"
              tone={toFixOnly ? "critical" : "secondary"}
              width="wide"
              ariaPressed={toFixOnly}
              onClick={() => setToFixOnly((previous) => !previous)}
            >
              {toFixOnly ? "Actif : à corriger" : "Tous les enregistrements"}
            </CmmButton>
          </CmmField>

          <div className="flex items-end">
            {hasActiveFilters ? (
              <CmmButton type="button" tone="tertiary" width="wide" onClick={resetFilters}>
                <X size={14} aria-hidden="true" />
                <span>Réinitialiser</span>
              </CmmButton>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Ligne de synthèse réelle des résultats */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--border-default)] pb-2.5 cmm-text-caption cmm-text-secondary">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold cmm-text-primary">
            {isLoading ? "Chargement…" : countLabel}
          </span>
          {qualityFilter !== "all" ? (
            <CmmBadge tone="slate" shape="pill">Grade {qualityFilter}</CmmBadge>
          ) : null}
          {toFixOnly ? (
            <CmmBadge tone="rose" shape="pill">À corriger</CmmBadge>
          ) : null}
          {partialSource ? (
            <CmmBadge tone="amber" shape="pill">
              Sources partielles : {partialSourcesLabel}
            </CmmBadge>
          ) : null}
        </div>
        {hasActiveFilters && !filtersOpen ? (
          <button
            type="button"
            onClick={resetFilters}
            className="font-semibold text-emerald-700 underline-offset-2 hover:underline"
          >
            Réinitialiser les filtres
          </button>
        ) : null}
      </div>

      {/* Export PDF à la demande */}
      <CmmDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        ariaLabel="Exporter l’historique terrain en PDF"
        size="md"
        panelClassName="rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] p-4 shadow-xl sm:p-6"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="cmm-text-h3 cmm-text-primary">Exporter l’historique en PDF</h2>
            <CmmButton type="button" size="sm" tone="tertiary" onClick={() => setExportOpen(false)}>
              Fermer
            </CmmButton>
          </div>
          <RubriquePdfExportButton
            rubrique="historique_terrain"
            periode={`filtre_${statusFilter}_${new Date().getFullYear()}`}
            organizationType="profil"
            defaultTitle="Rapport historique terrain"
            data={pdfData}
            disabled={isLoading || Boolean(error) || approvedFilteredItems.length === 0}
          />
        </div>
      </CmmDialog>
    </div>
  );
}

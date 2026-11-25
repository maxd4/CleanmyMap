import { AlertCircle, PlusCircle, RotateCcw } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { CmmField } from "@/components/ui/cmm-field";
import {
  KIND_FILTERS,
  CONTRIBUTION_FILTERS,
  ENGAGEMENT_DOMAIN_FILTERS,
  type EntityKind,
  type ContributionType,
  type EngagementDomainFilter,
  type ZoneFilter,
} from "./annuaire-filters";
import { PARIS_ARRONDISSEMENTS, type ParisArrondissement } from "@/lib/geo/paris-arrondissements";

interface AnnuaireFiltersCardProps {
  fr: boolean;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filterKind: EntityKind | "all";
  setFilterKind: (val: EntityKind | "all") => void;
  filterContribution: ContributionType | "all";
  setFilterContribution: (val: ContributionType | "all") => void;
  engagementDomain: EngagementDomainFilter;
  setEngagementDomain: (val: EngagementDomainFilter) => void;
  zoneFilter: ZoneFilter;
  setZoneFilter: (val: ZoneFilter) => void;
  setActorCardsPage: (val: number | ((prev: number) => number)) => void;
  resetFilters: () => void;
  targetArrondissement: number | null;
  resultsCount: number;
}

/** Mots-clés de recherche (pas des classifications) : ils alimentent la recherche textuelle unique. */
const KEYWORD_OPTIONS = [
  { id: "propreté", fr: "Propreté", en: "Cleanliness" },
  { id: "climat", fr: "Climat", en: "Climate" },
  { id: "sensibilisation", fr: "Sensibilisation", en: "Awareness" },
] as const;

function parseZone(raw: string): ZoneFilter {
  if (raw === "all") return "all";
  if (raw === "nearby") return "nearby";
  return Number.parseInt(raw, 10) as ParisArrondissement;
}

function AnnuaireEmptyState({
  fr,
  resetFilters,
}: Pick<AnnuaireFiltersCardProps, "fr" | "resetFilters">) {
  return (
    <div
      role="status"
      className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)] p-4 md:flex-row md:items-center"
    >
      <div className="flex items-start gap-3">
        <AlertCircle size={20} className="mt-0.5 cmm-text-warning" aria-hidden="true" />
        <div className="space-y-1">
          <h4 className="text-sm font-semibold cmm-text-primary">
            {fr ? "Aucun résultat" : "No results"}
          </h4>
          <p className="text-sm cmm-text-secondary">
            {fr
              ? "Essayez d'élargir le périmètre ou de retirer certains filtres."
              : "Try widening the radius or removing some filters."}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CmmButton type="button" tone="secondary" variant="pill" onClick={resetFilters}>
          <RotateCcw size={14} className="mr-2" aria-hidden="true" />
          {fr ? "Réinitialiser" : "Reset"}
        </CmmButton>
        <CmmButton href="/partners/onboarding" tone="primary" variant="pill">
          <PlusCircle size={14} className="mr-2" aria-hidden="true" />
          {fr ? "Proposer" : "Propose"}
        </CmmButton>
      </div>
    </div>
  );
}

/**
 * Filtres de l'Annuaire sous forme de menus déroulants natifs (accessibles au
 * clavier). Owner unique de l'UI de filtrage ; l'état reste dans useAnnuaireLogic.
 */
export function AnnuaireFiltersCard({
  fr,
  searchTerm,
  setSearchTerm,
  filterKind,
  setFilterKind,
  filterContribution,
  setFilterContribution,
  engagementDomain,
  setEngagementDomain,
  zoneFilter,
  setZoneFilter,
  setActorCardsPage,
  resetFilters,
  targetArrondissement,
  resultsCount,
}: AnnuaireFiltersCardProps) {
  const keyword = KEYWORD_OPTIONS.some((option) => option.id === searchTerm) ? searchTerm : "";
  const hasActiveFilter =
    searchTerm !== "" ||
    filterKind !== "all" ||
    filterContribution !== "all" ||
    engagementDomain !== "all" ||
    zoneFilter !== "all";
  const extraActive = filterContribution !== "all" || keyword !== "";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <CmmField label={fr ? "Type de structure" : "Structure type"}>
          <select
            className="cmm-input w-full"
            value={filterKind}
            onChange={(event) => {
              setActorCardsPage(1);
              setFilterKind(event.target.value as EntityKind | "all");
            }}
          >
            {KIND_FILTERS.map((item) => (
              <option key={item.id} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </CmmField>
        <CmmField label={fr ? "Domaine d'engagement" : "Engagement domain"}>
          <select
            className="cmm-input w-full"
            value={engagementDomain}
            onChange={(event) => {
              setActorCardsPage(1);
              setEngagementDomain(event.target.value as EngagementDomainFilter);
            }}
          >
            {ENGAGEMENT_DOMAIN_FILTERS.map((item) => (
              <option key={item.value} value={item.value}>
                {fr ? item.label : item.englishLabel}
              </option>
            ))}
          </select>
        </CmmField>
        <CmmField label={fr ? "Arrondissement" : "Arrondissement"}>
          <select
            className="cmm-input w-full"
            value={String(zoneFilter)}
            onChange={(event) => {
              setActorCardsPage(1);
              setZoneFilter(parseZone(event.target.value));
            }}
          >
            <option value="all">{fr ? "Tout Paris" : "All Paris"}</option>
            {targetArrondissement ? (
              <option value="nearby">{fr ? "Proches de moi" : "Nearby"}</option>
            ) : null}
            {PARIS_ARRONDISSEMENTS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </CmmField>
      </div>

      <CmmDisclosure
        size="sm"
        defaultOpen={extraActive}
        summary={fr ? "Filtres supplémentaires" : "More filters"}
      >
        <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2">
          <CmmField label={fr ? "Type d'aide" : "Type of help"}>
            <select
              className="cmm-input w-full"
              value={filterContribution}
              onChange={(event) => {
                setActorCardsPage(1);
                setFilterContribution(event.target.value as ContributionType | "all");
              }}
            >
              {CONTRIBUTION_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </CmmField>
          <CmmField
            label={fr ? "Mot-clé" : "Keyword"}
            hint={
              fr
                ? "Recherche par mot-clé, pas une classification ni une certification."
                : "Keyword search, not a classification or certification."
            }
          >
            <select
              className="cmm-input w-full"
              value={keyword}
              onChange={(event) => {
                setActorCardsPage(1);
                setSearchTerm(event.target.value);
              }}
            >
              <option value="">{fr ? "Aucun mot-clé" : "No keyword"}</option>
              {KEYWORD_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {fr ? option.fr : option.en}
                </option>
              ))}
            </select>
          </CmmField>
        </div>
      </CmmDisclosure>

      {hasActiveFilter && resultsCount > 0 ? (
        <CmmButton type="button" tone="tertiary" variant="pill" onClick={resetFilters}>
          <RotateCcw size={14} className="mr-2" aria-hidden="true" />
          {fr ? "Réinitialiser les filtres" : "Reset filters"}
        </CmmButton>
      ) : null}

      {resultsCount === 0 ? <AnnuaireEmptyState fr={fr} resetFilters={resetFilters} /> : null}
    </div>
  );
}

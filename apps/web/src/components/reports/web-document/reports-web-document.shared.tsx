"use client";

import type { ActionDataContract } from "@/lib/actions/data-contract";
import type { ReportExportAvailability } from "@/lib/reports/report-export-quota-contract";
import {
  DEFAULT_REPORT_DETAIL_LEVEL,
  DEFAULT_REPORT_GENERATION_PERIOD,
  DEFAULT_REPORT_MODULES,
  DETAIL_LEVEL_OPTIONS,
  REPORT_MODULE_DEFINITIONS,
  REQUIRED_CORE_CHAPTER_IDS,
  buildModuleSelectionLabel,
  buildPdfData,
  buildReportTitle,
  detailLevelLabel,
  detailLevelDescription,
  periodLabel,
  reportPeriodLabel,
  type DetailLevelId,
  type ModuleState,
  type PeriodId,
  type SelectedPeriodId,
} from "@/lib/reports/report-pdf-data";

export {
  DEFAULT_REPORT_DETAIL_LEVEL,
  DEFAULT_REPORT_GENERATION_PERIOD,
  DEFAULT_REPORT_MODULES,
  DETAIL_LEVEL_OPTIONS,
  REPORT_MODULE_DEFINITIONS,
  REQUIRED_CORE_CHAPTER_IDS,
  buildModuleSelectionLabel,
  buildPdfData,
  buildReportTitle,
  detailLevelLabel,
  detailLevelDescription,
  periodLabel,
  reportPeriodLabel,
};

export type { DetailLevelId, ModuleState, PeriodId, SelectedPeriodId };

export type ReportGenerationUiState = "idle" | "pending" | "success" | "error";

type ReportExportStatusKind =
  | "loading"
  | "success"
  | "error"
  | "quota-used"
  | "quota-unavailable"
  | "no-data"
  | "ready";

export type ReportExportStatusSummary = {
  kind: ReportExportStatusKind;
  label: string;
  description: string;
};

export function resolveReportExportStatus({
  state,
  hasData,
  isLoading,
  hasError,
  dailyExportAvailability,
  message,
}: {
  state: ReportGenerationUiState;
  hasData: boolean;
  isLoading: boolean;
  hasError: boolean;
  dailyExportAvailability: ReportExportAvailability;
  message?: string | null;
}): ReportExportStatusSummary {
  if (state === "pending" || isLoading) {
    return { kind: "loading", label: "Génération en cours", description: "Préparation du PDF en cours." };
  }
  if (state === "success") {
    return { kind: "success", label: "Rapport généré", description: "PDF ouvert." };
  }
  if (state === "error") {
    return { kind: "error", label: "Erreur d’export", description: message ?? "Une erreur empêche l’export." };
  }
  if (hasError) {
    return { kind: "error", label: "Données indisponibles", description: "Impossible de charger les données du rapport." };
  }
  if (dailyExportAvailability === "used") {
    return { kind: "quota-used", label: "Quota quotidien atteint", description: "Le prochain export sera disponible le jour civil suivant." };
  }
  if (dailyExportAvailability === "unavailable") {
    return { kind: "quota-unavailable", label: "Quota indisponible", description: "La disponibilité du quota ne peut pas être confirmée." };
  }
  if (!hasData) {
    return { kind: "no-data", label: "Aucune donnée exploitable", description: "Aucune donnée ne permet de générer ce rapport." };
  }
  return { kind: "ready", label: "Prêt à générer", description: "La configuration actuelle permet de lancer l’export." };
}

function formatDateLabel(value: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(value);
}

export function buildCoverageRangeLabel(contracts: ActionDataContract[]): string {
  const observedDates = contracts
    .map((contract) => new Date(contract.dates.observedAt))
    .filter((date) => !Number.isNaN(date.getTime()));
  if (observedDates.length === 0) return "Aucune date exploitable";
  const timestamps = observedDates.map((date) => date.getTime());
  const minDate = new Date(Math.min(...timestamps));
  const maxDate = new Date(Math.max(...timestamps));
  if (minDate.getTime() === maxDate.getTime()) return formatDateLabel(minDate);
  return `${formatDateLabel(minDate)} → ${formatDateLabel(maxDate)}`;
}

export function buildScopeSelectValue(kind: string, value: string): string {
  return kind === "global" || !value ? "global" : `${kind}:${value}`;
}

export function parseScopeSelectValue(
  value: string,
): { kind: "global"; value: "" } | { kind: "account" | "association" | "arrondissement"; value: string } {
  if (!value || value === "global") return { kind: "global", value: "" };
  const [kind, ...rest] = value.split(":");
  const parsedValue = rest.join(":");
  if (!parsedValue) return { kind: "global", value: "" };
  if (kind === "account" || kind === "association" || kind === "arrondissement") {
    return { kind, value: parsedValue };
  }
  return { kind: "global", value: "" };
}

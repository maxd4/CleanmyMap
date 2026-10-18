import type { ReportAdvancedFilters } from "./report-advanced-filters";
import type {
  DetailLevelId,
  ModuleState,
  SelectedPeriodId,
} from "./report-pdf-data";
import type { ReportScopeKind } from "./scope";
import type { ReportPdfTheme } from "@/lib/pdf-export/report-pdf-theme";
import type { ReportGenerationSnapshotRecord } from "./report-generation-history-store";

export type ReportGenerationResumeScopeKind = ReportScopeKind | "single_action";

export type ReportGenerationResumeConfig = {
  generationId: string;
  generatedAt: string;
  period: {
    id: SelectedPeriodId | null;
    from: string | null;
    to: string | null;
  };
  scope: {
    kind: ReportGenerationResumeScopeKind;
    value: string;
    label: string;
  } | null;
  detailLevel: DetailLevelId | null;
  modules: ModuleState | null;
  filters: ReportAdvancedFilters | null;
  theme: ReportPdfTheme | null;
  unknownParameters: string[];
};

const PERIOD_IDS: readonly SelectedPeriodId[] = [
  "thirty_days",
  "three_months",
  "six_months",
  "twelve_months",
  "current_year",
  "full_history",
  "custom_range",
];

function isPeriodId(value: unknown): value is SelectedPeriodId {
  return typeof value === "string" && PERIOD_IDS.includes(value as SelectedPeriodId);
}
function isDetailLevel(value: unknown): value is DetailLevelId {
  return value === "concis" || value === "default" || value === "exhaustif";
}

function isModuleState(value: unknown): value is ModuleState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return [
    "dataAndCartography",
    "transparencyAndMethods",
    "rawData",
    "detailedFiles",
  ].every((key) => typeof candidate[key] === "boolean");
}

function isTheme(value: unknown): value is ReportPdfTheme {
  return value === "impact" || value === "scientific";
}

function isScopeKind(value: unknown): value is ReportGenerationResumeScopeKind {
  return value === "global" || value === "account" || value === "association" ||
    value === "arrondissement" || value === "single_action";
}

function isCivilDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function resolvePeriod(record: ReportGenerationSnapshotRecord): ReportGenerationResumeConfig["period"] {
  const metadataPeriod = record.snapshot.snapshotMetadata?.period;
  const id = isPeriodId(metadataPeriod?.id)
    ? metadataPeriod.id
    : isPeriodId(record.snapshot.periode)
      ? record.snapshot.periode
      : null;
  const from = isCivilDate(metadataPeriod?.from)
    ? metadataPeriod.from
    : isCivilDate(record.snapshot.data.periodRange?.from)
      ? record.snapshot.data.periodRange.from
      : null;
  const to = isCivilDate(metadataPeriod?.to)
    ? metadataPeriod.to
    : isCivilDate(record.snapshot.data.periodRange?.to)
      ? record.snapshot.data.periodRange.to
      : null;
  return { id, from, to };
}

function resolveScope(record: ReportGenerationSnapshotRecord): ReportGenerationResumeConfig["scope"] {
  const metadataScope = record.snapshot.snapshotMetadata?.scope;
  const kind = isScopeKind(metadataScope?.kind)
    ? metadataScope.kind
    : isScopeKind(record.scopeKind)
      ? record.scopeKind
      : null;
  const value = typeof metadataScope?.value === "string"
    ? metadataScope.value
    : typeof record.scopeValue === "string"
      ? record.scopeValue
      : null;
  const label = typeof metadataScope?.label === "string" && metadataScope.label.trim()
    ? metadataScope.label.trim()
    : record.scopeLabel.trim();
  if (!kind || value === null || !label) return null;
  return { kind, value, label };
}

export function buildReportGenerationResumeConfig(
  record: ReportGenerationSnapshotRecord,
): ReportGenerationResumeConfig {
  const metadata = record.snapshot.snapshotMetadata;
  const period = resolvePeriod(record);
  const scope = resolveScope(record);
  const detailLevel = isDetailLevel(metadata?.detailLevel)
    ? metadata.detailLevel
    : isDetailLevel(record.detailLevel)
      ? record.detailLevel
      : null;
  const modules = isModuleState(metadata?.modules)
    ? metadata.modules
    : isModuleState(record.modules)
      ? record.modules
      : null;
  const filters = metadata?.filters ?? null;
  const theme = isTheme(record.theme) ? record.theme : null;
  const unknownParameters: string[] = [];

  if (!period.id) unknownParameters.push("La période d'origine est inconnue.");
  if (period.id === "custom_range" && (!period.from || !period.to)) {
    unknownParameters.push("Les bornes de la période personnalisée d'origine sont incomplètes.");
  }
  if (!scope) unknownParameters.push("Le périmètre d'origine est inconnu.");
  if (!detailLevel) unknownParameters.push("Le niveau de détail d'origine est inconnu.");
  if (!modules) unknownParameters.push("Les modules d'origine sont inconnus.");
  if (!filters && scope?.kind !== "single_action") {
    unknownParameters.push("Les filtres avancés d'origine sont inconnus.");
  }
  if (!theme) unknownParameters.push("Le thème PDF d'origine n'est pas enregistré.");

  return {
    generationId: record.id,
    generatedAt: record.generatedAt,
    period,
    scope,
    detailLevel,
    modules,
    filters,
    theme,
    unknownParameters,
  };
}

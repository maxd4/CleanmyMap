import type { ReportGenerationResumeConfig } from "@/lib/reports/report-generation-resume";
import {
  DEFAULT_REPORT_GENERATION_PERIOD,
  reportPeriodLabel,
  type SelectedPeriodId,
} from "./reports-web-document.shared";
import type { ReportsResumeStatus } from "./reports-web-document.types";

const RESUMABLE_PERIODS: readonly SelectedPeriodId[] = [
  "thirty_days",
  "three_months",
  "six_months",
  "twelve_months",
  "current_year",
  "full_history",
];

export function resolveResumedPeriod(
  resumeConfig: ReportGenerationResumeConfig | undefined,
): SelectedPeriodId {
  const period = resumeConfig?.period.id;
  return period === "custom_range" || RESUMABLE_PERIODS.includes(period as SelectedPeriodId)
    ? period as SelectedPeriodId
    : DEFAULT_REPORT_GENERATION_PERIOD;
}

function formatResumeDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

export function buildResumeNoticeLines(params: {
  resumeConfig?: ReportGenerationResumeConfig;
  resumeStatus?: ReportsResumeStatus;
  scopeNeedsNewSelection: boolean;
}): string[] {
  const lines: string[] = [];
  const { resumeConfig, resumeStatus } = params;
  if (resumeConfig) {
    const from = formatResumeDate(resumeConfig.period.from);
    const to = formatResumeDate(resumeConfig.period.to);
    if (resumeConfig.period.id && resumeConfig.period.id !== "custom_range") {
      lines.push(
        `Snapshot du ${formatResumeDate(resumeConfig.generatedAt.slice(0, 10)) ?? resumeConfig.generatedAt} · bornes d'origine${from ? ` : ${from}` : ""}${to ? ` → ${to}` : ""}. Une nouvelle génération relative utilisera ${reportPeriodLabel(resumeConfig.period.id, false)} sur la période courante au moment du lancement.`,
      );
    } else if (resumeConfig.period.id === "custom_range") {
      lines.push(`Bornes d'origine restaurées : ${from ?? "inconnue"} → ${to ?? "inconnue"}. La nouvelle génération conservera ces dates personnalisées si elles restent valides.`);
    }
    lines.push(...resumeConfig.unknownParameters);
  }
  if (resumeStatus === "not_found" || resumeStatus === "invalid") {
    lines.push("La génération historique n'est pas accessible ; aucun paramètre inconnu n'a été inventé.");
  } else if (resumeStatus === "unavailable") {
    lines.push("La résolution de la génération historique est temporairement indisponible ; aucun paramètre inconnu n'a été inventé.");
  }
  if (params.scopeNeedsNewSelection) {
    lines.push(
      resumeConfig?.scope?.kind === "single_action"
        ? "L'action d'origine n'est plus admissible ou accessible. Sélectionnez un nouveau périmètre valide avant de générer."
        : "Le périmètre d'origine n'est plus accessible. Sélectionnez un nouveau périmètre valide avant de générer.",
    );
  }
  return lines;
}

export function getScopeOptionsKey(kind: string): "accounts" | "associations" | "arrondissements" {
  return kind === "account" ? "accounts" : kind === "association" ? "associations" : "arrondissements";
}

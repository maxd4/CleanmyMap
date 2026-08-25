import { buildProjectSignalBreakdown, buildProjectSignalsHighlights, parseDateOrNull, PROJECT_SIGNAL_VOLUME_NOTE, type ProjectSignalRows } from "./project-signals.calculations";
import { calculateCodexMonthlyUsageInput, calculateMonthlyUsageInput } from "./project-signals-usage";
import { calculateAllTimeScopeInput, findAccountCreatedAt, findEarliestDate } from "./project-signals-scope";
import type {
  EnvironmentalImpactCodexUsageWeeklySnapshotRecord,
  EnvironmentalImpactProjectSignals,
} from "./types";
import type { GitHubRepositoryStats } from "@/lib/github/github-repository-stats";

export function buildEnvironmentalImpactProjectSignals(
  rows: ProjectSignalRows,
  params: {
    generatedAt: string;
    userId: string | null;
    oldestProfileCreatedAt?: string | null;
    accountCreatedAt?: string | null;
  },
  codexSnapshots: EnvironmentalImpactCodexUsageWeeklySnapshotRecord[] = [],
  githubRepositoryStats: GitHubRepositoryStats | null = null,
): EnvironmentalImpactProjectSignals {
  const generatedAtDate = parseDateOrNull(params.generatedAt) ?? new Date(params.generatedAt);
  const launchedAt = findEarliestDate(rows, params.oldestProfileCreatedAt ?? null);
  const accountCreatedAt = params.userId
    ? findAccountCreatedAt(rows, params.userId, params.accountCreatedAt ?? null)
    : null;
  const codexUsage = calculateCodexMonthlyUsageInput(codexSnapshots);
  const githubWorkflowRunsCount30d = githubRepositoryStats?.workflowRunsCount30d ?? null;
  const siteInput = calculateAllTimeScopeInput(rows, {
    userId: null,
    accountCreatedAt: null,
  });
  const userInput = calculateAllTimeScopeInput(rows, {
    userId: params.userId,
    accountCreatedAt,
  });

  return {
    generatedAt: generatedAtDate.toISOString(),
    launchedAt,
    accountCreatedAt,
    userId: params.userId,
    periodDays: 30,
    recentWindowDays: 30,
    siteInput,
    userInput,
    codexUsage: codexUsage.codexUsage,
    signalBreakdown: buildProjectSignalBreakdown(rows),
    infrastructureInput: {
      launchedAt,
      referencePeriodMonths: launchedAt
        ? Math.max(1, Math.min(240, Math.ceil((generatedAtDate.getTime() - new Date(launchedAt).getTime()) / (30 * 24 * 60 * 60 * 1000))))
        : 12,
      metrics:
        githubWorkflowRunsCount30d !== null
          ? {
              githubWorkflowRunsCount30d,
            }
          : undefined,
      usage: {
        ...calculateMonthlyUsageInput(rows),
        ...codexUsage.usage,
        ...(githubWorkflowRunsCount30d !== null
          ? { monthlyDeployments: githubWorkflowRunsCount30d }
          : {}),
      },
    },
    highlights: [
      ...buildProjectSignalsHighlights(rows),
      ...(codexUsage.codexUsage.weekCount > 0
        ? [
            {
              label: "Codex CleanMyMap",
              value: codexUsage.codexUsage.estimatedKgCo2eProxy,
              detail: `Journal hebdomadaire sur ${codexUsage.codexUsage.weekCount} semaine${codexUsage.codexUsage.weekCount > 1 ? "s" : ""}.`,
              basis: "recent" as const,
            },
          ]
        : []),
      ...(githubWorkflowRunsCount30d !== null
        ? [
            {
              label: "GitHub Actions runs",
              value: githubWorkflowRunsCount30d,
              detail:
                "Workflow runs GitHub Actions completés sur 30 jours. Cette donnée remplace la projection dérivée sur le poste des déploiements.",
              basis: "recent" as const,
            },
          ]
        : []),
    ],
    notes: [
      PROJECT_SIGNAL_VOLUME_NOTE,
      "Les signaux proviennent des tables opérationnelles CleanMyMap, pas de moyennes externes.",
      "Les vues de page utilisent désormais page_view comme signal route-level principal, avec fallback sur view_new pour l'historique.",
      "Les emails Resend sont journalisés via le service email central pour garder un historique localisé.",
      "Les événements communautaires, RSVP et notifications app sont intégrés pour refléter l'usage produit réel et non un proxy générique.",
      "Les images stockées sont déduites des training_examples et de leurs pièces jointes, afin de rester projet-spécifique.",
      "Les métriques mensuelles sont projetées à partir des 30 derniers jours observés sur le projet.",
      githubWorkflowRunsCount30d === null
        ? "GitHub Actions runs sur 30 jours: NA; le poste de déploiements conserve un proxy dérivé."
        : `GitHub Actions runs sur 30 jours: ${githubWorkflowRunsCount30d}; le poste des déploiements est branché directement sur cette source.`,
      ...codexUsage.codexUsage.notes,
    ],
  };
}

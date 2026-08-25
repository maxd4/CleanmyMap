import type { SupabaseClient } from "@supabase/supabase-js";
import { loadProjectSignalData } from "./project-signals-loader";
import { buildEnvironmentalImpactProjectSignals } from "./project-signals-orchestration";
import type { EnvironmentalImpactProjectSignals } from "./types";
import type { GitHubRepositoryStats } from "@/lib/github/github-repository-stats";

export { PROJECT_SIGNAL_ROW_LIMIT } from "./project-signals.constants";
export { buildEnvironmentalImpactProjectSignals } from "./project-signals-orchestration";

export async function loadEnvironmentalImpactProjectSignals(
  supabase: SupabaseClient,
  params: {
    userId: string | null;
    generatedAt?: string;
    githubRepositoryStats?: GitHubRepositoryStats | null;
  },
): Promise<EnvironmentalImpactProjectSignals> {
  const generatedAt = params.generatedAt ?? new Date().toISOString();
  const loaded = await loadProjectSignalData(supabase, {
    userId: params.userId,
  });

  return buildEnvironmentalImpactProjectSignals(
    loaded.rows,
    {
      generatedAt,
      userId: params.userId,
      oldestProfileCreatedAt: loaded.oldestProfileCreatedAt,
      accountCreatedAt: loaded.accountCreatedAt,
    },
    loaded.codexSnapshots,
    params.githubRepositoryStats ?? null,
  );
}

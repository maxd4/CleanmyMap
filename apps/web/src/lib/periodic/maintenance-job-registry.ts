import {
  generateAndPersistPublicImpactSnapshot,
  getImpactSnapshotMonthDate,
  loadLatestPublicImpactSnapshot,
  PUBLIC_IMPACT_SNAPSHOT_KEY,
  PUBLIC_IMPACT_SNAPSHOT_VERSION,
} from "@/lib/impact/public-impact-snapshot";
import {
  loadGovernanceMonthlyReport,
} from "@/lib/governance/governance-monthly-report-store";
import {
  GOVERNANCE_MONTHLY_JOB_VERSION,
  runGovernanceMonthlyJob,
} from "./governance-monthly-job";
import {
  PLATFORM_USAGE_JOB_VERSION,
  PLATFORM_USAGE_SNAPSHOT_KEY,
  runPlatformUsageJob,
} from "./platform-usage-job";
import {
  MAP_POLLUTION_REFERENCES_SNAPSHOT_KEY,
  MAP_POLLUTION_REFERENCES_VERSION,
  runPollutionScoreReferencesJob,
} from "@/lib/actions/pollution/pollution-score-reference-snapshot";
import { readLatestPublicSurfaceSnapshot } from "@/lib/public-surface-snapshots";
import { getUtcMonthStart, getUtcWeekStart } from "./periodic-job-calendar";

export const MAINTENANCE_JOB_IDS = [
  "impact-terrain",
  "platform-usage",
  "map-pollution-references",
  "governance-report",
] as const;

export type MaintenanceJobId = (typeof MAINTENANCE_JOB_IDS)[number];
export type MaintenanceJobCadence = "weekly" | "monthly";
export type MaintenanceJobStatus = "executed" | "skipped" | "failed";

export type MaintenanceJobOutcome = {
  job: MaintenanceJobId;
  cadence: MaintenanceJobCadence;
  period: string;
  status: MaintenanceJobStatus;
  reason?: "reused" | "not_due";
  error?: "Échec du job.";
};

export type MaintenanceDispatchResult = {
  status: "ok" | "degraded";
  generatedAt: string;
  jobs: MaintenanceJobOutcome[];
};

export type MaintenanceJobDefinition = {
  id: MaintenanceJobId;
  cadence: MaintenanceJobCadence;
  getPeriod: (now: Date) => string;
  isProduced: (period: string) => Promise<boolean>;
  run: (now: Date) => Promise<unknown>;
};

function isPeriodDue(now: Date, period: string): boolean {
  return new Date(`${period}T00:00:00.000Z`).getTime() <= now.getTime();
}

async function hasImpactSnapshot(period: string): Promise<boolean> {
  const snapshot = await loadLatestPublicImpactSnapshot();
  return Boolean(
    snapshot &&
      snapshot.snapshotKey === PUBLIC_IMPACT_SNAPSHOT_KEY &&
      snapshot.snapshotDate === period &&
      snapshot.version === PUBLIC_IMPACT_SNAPSHOT_VERSION,
  );
}

async function hasWeeklySnapshot(
  snapshotKey: string,
  version: string,
  period: string,
): Promise<boolean> {
  const snapshot = await readLatestPublicSurfaceSnapshot(snapshotKey);
  return Boolean(
    snapshot &&
      snapshot.snapshotDate === period &&
      snapshot.version === version,
  );
}

async function hasGovernanceReport(period: string): Promise<boolean> {
  const report = await loadGovernanceMonthlyReport(period);
  return Boolean(report && report.version === GOVERNANCE_MONTHLY_JOB_VERSION);
}

export const MAINTENANCE_JOB_REGISTRY: readonly MaintenanceJobDefinition[] = [
  {
    id: "impact-terrain",
    cadence: "monthly",
    getPeriod: (now) => getImpactSnapshotMonthDate(now.toISOString()),
    isProduced: hasImpactSnapshot,
    run: async (now) => generateAndPersistPublicImpactSnapshot({ now }),
  },
  {
    id: "platform-usage",
    cadence: "weekly",
    getPeriod: getUtcWeekStart,
    isProduced: (period) =>
      hasWeeklySnapshot(PLATFORM_USAGE_SNAPSHOT_KEY, PLATFORM_USAGE_JOB_VERSION, period),
    run: async (now) => runPlatformUsageJob({ now }),
  },
  {
    id: "map-pollution-references",
    cadence: "weekly",
    getPeriod: getUtcWeekStart,
    isProduced: (period) =>
      hasWeeklySnapshot(
        MAP_POLLUTION_REFERENCES_SNAPSHOT_KEY,
        MAP_POLLUTION_REFERENCES_VERSION,
        period,
      ),
    run: async (now) => runPollutionScoreReferencesJob({ now }),
  },
  {
    id: "governance-report",
    cadence: "monthly",
    getPeriod: getUtcMonthStart,
    isProduced: hasGovernanceReport,
    run: async (now) => runGovernanceMonthlyJob({ now }),
  },
];

export async function runMaintenanceJobs(params: {
  now?: Date;
  jobs?: readonly MaintenanceJobDefinition[];
} = {}): Promise<MaintenanceDispatchResult> {
  const now = params.now ?? new Date();
  const generatedAt = now.toISOString();
  const jobs = params.jobs ?? MAINTENANCE_JOB_REGISTRY;
  const outcomes: MaintenanceJobOutcome[] = [];

  for (const job of jobs) {
    const period = job.getPeriod(now);

    try {
      if (!isPeriodDue(now, period)) {
        outcomes.push({
          job: job.id,
          cadence: job.cadence,
          period,
          status: "skipped",
          reason: "not_due",
        });
        continue;
      }

      if (await job.isProduced(period)) {
        outcomes.push({
          job: job.id,
          cadence: job.cadence,
          period,
          status: "skipped",
          reason: "reused",
        });
        continue;
      }

      await job.run(now);
      outcomes.push({
        job: job.id,
        cadence: job.cadence,
        period,
        status: "executed",
      });
    } catch (error) {
      console.error(
        `[cron/maintenance] ${job.id} failed for ${period}.`,
        error instanceof Error ? error.message : "Unknown failure",
      );
      outcomes.push({
        job: job.id,
        cadence: job.cadence,
        period,
        status: "failed",
        error: "Échec du job.",
      });
    }
  }

  return {
    status: outcomes.some((outcome) => outcome.status === "failed")
      ? "degraded"
      : "ok",
    generatedAt,
    jobs: outcomes,
  };
}

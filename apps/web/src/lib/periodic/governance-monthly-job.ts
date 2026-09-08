import {
  captureGovernanceMonthlyReport,
} from "@/lib/governance/governance-monthly-report";
import { GOVERNANCE_MONTHLY_REPORT_VERSION } from "@/lib/governance/governance-monthly-report.persistence";
import {
  loadGovernanceMonthlyReport,
  type GovernanceMonthlyReportRecord,
} from "@/lib/governance/governance-monthly-report-store";
import {
  readLatestPublicSurfaceSnapshot,
  type PublicSurfaceSnapshotRecord,
} from "@/lib/public-surface-snapshots";
import {
  PLATFORM_USAGE_SNAPSHOT_KEY,
  type PlatformUsageSnapshotPayload,
} from "./platform-usage-job";
import { getUtcMonthStart } from "./periodic-job-calendar";

export const GOVERNANCE_MONTHLY_JOB_VERSION = GOVERNANCE_MONTHLY_REPORT_VERSION;

export class GovernanceMonthlyJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GovernanceMonthlyJobError";
  }
}

export async function runGovernanceMonthlyJob(params: {
  now?: Date;
  force?: boolean;
  readPlatformUsageSnapshot?: () => Promise<PublicSurfaceSnapshotRecord<PlatformUsageSnapshotPayload> | null>;
  readReport?: (month: string) => Promise<GovernanceMonthlyReportRecord | null>;
  captureReport?: (input: {
    environmentalImpact: PlatformUsageSnapshotPayload["environmentalImpact"];
    storageUsage: PlatformUsageSnapshotPayload["storageUsage"];
    generatedAt: string;
  }) => Promise<GovernanceMonthlyReportRecord>;
} = {}): Promise<{ status: "captured" | "reused"; report: GovernanceMonthlyReportRecord }> {
  const now = params.now ?? new Date();
  const reportMonth = getUtcMonthStart(now);
  const readReport = params.readReport ?? loadGovernanceMonthlyReport;
  const existing = await readReport(reportMonth);

  if (!params.force && existing?.version === GOVERNANCE_MONTHLY_JOB_VERSION) {
    return { status: "reused", report: existing };
  }

  const readPlatformUsageSnapshot =
    params.readPlatformUsageSnapshot ?? (() =>
      readLatestPublicSurfaceSnapshot<PlatformUsageSnapshotPayload>(PLATFORM_USAGE_SNAPSHOT_KEY));
  const platformSnapshot = await readPlatformUsageSnapshot();
  if (!platformSnapshot) {
    throw new GovernanceMonthlyJobError(
      "Impossible de produire le rapport mensuel : aucun snapshot PLATFORM_USAGE disponible.",
    );
  }

  const captureReport = params.captureReport ?? captureGovernanceMonthlyReport;
  const report = await captureReport({
    environmentalImpact: platformSnapshot.payload.environmentalImpact,
    storageUsage: platformSnapshot.payload.storageUsage,
    generatedAt: now.toISOString(),
  });

  return { status: "captured", report };
}

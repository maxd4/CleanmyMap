import { join } from "node:path";
import { allowLocalFileStoreFallback, canUseSupabaseServerPersistence } from "@/lib/persistence/runtime-store";
import {
  readLocalRecordStore,
  writeLocalRecordStore,
  type LocalRecordStorePayload,
} from "@/lib/persistence/local-record-store";
import type { ServiceThresholdAlert } from "@/lib/environmental-impact-estimator/service-risk";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { StorageBusinessContributionReport } from "@/lib/supabase/storage-business-contribution";
import { normalizeGovernanceImpactPayload } from "./governance-monthly-report-impact-normalizer";

export type GovernanceMonthlyReportPayload = {
  generatedAt: string;
  reportMonth: string;
  reportMonthLabel: string;
  summary: string[];
  projectSignals: {
    traffic: {
      pageViewEvents: number;
      legacyPageViewEvents: number;
      distinctRoutes: number;
      topRoutes: Array<{
        path: string;
        count: number;
      }>;
    };
    community: {
      events: number;
      rsvps: number;
      notifications: number;
      unreadNotifications: number;
    };
    communication: {
      emailsSent: number;
      pdfExports: number;
    };
  };
  impact: {
    monthlyKgCo2eProxy: number | null;
    confidencePercent: number | null;
    snapshotCount: number;
    latestSnapshotDate: string | null;
    topServiceLabel: string | null;
    topServiceMonthlyKgCo2eProxy: number | null;
    topServiceDeltaKgCo2eProxy: number | null;
    serviceBreakdown: Array<{
      key: string;
      label: string;
      currentKgCo2eProxy: number | null;
      previousKgCo2eProxy: number | null;
      deltaKgCo2eProxy: number | null;
    }>;
    growthHighlights: Array<{
      label: string;
      previousKgCo2eProxy: number | null;
      currentKgCo2eProxy: number | null;
      deltaKgCo2eProxy: number | null;
    }>;
  };
  storage: {
    quotaBytes: number;
    quotaLabel: string;
    totalBytes: number;
    totalLabel: string;
    remainingBytes: number;
    remainingLabel: string;
    usagePercent: number;
    objectCount: number;
    snapshotCount: number;
    latestSnapshotMonth: string | null;
    deltaBytes: number;
    deltaPercent: number | null;
    topBucketLabel: string | null;
    topBucketBytes: number;
    topExtensionLabel: string | null;
    topExtensionBytes: number;
    topContributionLabel: string | null;
    topContributionBytes: number;
    topContributionSharePercent: number;
    topContributionDeltaBytes: number;
    topContributionDeltaPercent: number | null;
    fastestGrowingLabel: string | null;
    fastestGrowingBytes: number;
    fastestGrowingDeltaBytes: number;
    fastestGrowingDeltaPercent: number | null;
    businessContributions: StorageBusinessContributionReport;
    growthHighlights: Array<{
      label: string;
      previousBytes: number;
      currentBytes: number;
      deltaBytes: number;
    }>;
    contributionHighlights: string[];
  };
  serviceThresholdAlerts: ServiceThresholdAlert[];
  notes: string[];
  artifacts?: {
    pdfStoragePath?: string | null;
    pdfGeneratedAt?: string | null;
  };
};

export type GovernanceMonthlyReportRecord = {
  id: string;
  reportKey: string;
  reportMonth: string;
  generatedAt: string;
  version: string;
  title: string;
  payload: GovernanceMonthlyReportPayload;
};

type GovernanceMonthlyReportStore = LocalRecordStorePayload<GovernanceMonthlyReportRecord>;

type GovernanceMonthlyReportRow = {
  id: number | string;
  report_key: string;
  report_month: string;
  generated_at: string;
  version: string;
  title: string;
  payload: GovernanceMonthlyReportPayload;
};

function emptyProjectSignals(): GovernanceMonthlyReportPayload["projectSignals"] {
  return {
    traffic: {
      pageViewEvents: 0,
      legacyPageViewEvents: 0,
      distinctRoutes: 0,
      topRoutes: [],
    },
    community: {
      events: 0,
      rsvps: 0,
      notifications: 0,
      unreadNotifications: 0,
    },
    communication: {
      emailsSent: 0,
      pdfExports: 0,
    },
  };
}

function normalizeProjectSignals(
  payload: GovernanceMonthlyReportPayload["projectSignals"] | null | undefined,
): GovernanceMonthlyReportPayload["projectSignals"] {
  if (!payload) {
    return emptyProjectSignals();
  }

  return {
    traffic: {
      pageViewEvents: payload.traffic?.pageViewEvents ?? 0,
      legacyPageViewEvents: payload.traffic?.legacyPageViewEvents ?? 0,
      distinctRoutes: payload.traffic?.distinctRoutes ?? 0,
      topRoutes: Array.isArray(payload.traffic?.topRoutes) ? payload.traffic.topRoutes : [],
    },
    community: {
      events: payload.community?.events ?? 0,
      rsvps: payload.community?.rsvps ?? 0,
      notifications: payload.community?.notifications ?? 0,
      unreadNotifications: payload.community?.unreadNotifications ?? 0,
    },
    communication: {
      emailsSent: payload.communication?.emailsSent ?? 0,
      pdfExports: payload.communication?.pdfExports ?? 0,
    },
  };
}

function normalizeStoragePayload(
  payload: GovernanceMonthlyReportPayload["storage"] | null | undefined,
): GovernanceMonthlyReportPayload["storage"] {
  const emptyBusinessContributions: StorageBusinessContributionReport = {
    previousSnapshotMonth: null,
    historyMonths: [],
    alerts: [],
    items: [],
  };

  if (!payload) {
    return {
      quotaBytes: 0,
      quotaLabel: "0 B",
      totalBytes: 0,
      totalLabel: "0 B",
      remainingBytes: 0,
      remainingLabel: "0 B",
      usagePercent: 0,
      objectCount: 0,
      snapshotCount: 0,
      latestSnapshotMonth: null,
      deltaBytes: 0,
      deltaPercent: null,
      topBucketLabel: null,
      topBucketBytes: 0,
      topExtensionLabel: null,
      topExtensionBytes: 0,
      growthHighlights: [],
      topContributionLabel: null,
      topContributionBytes: 0,
      topContributionSharePercent: 0,
      topContributionDeltaBytes: 0,
      topContributionDeltaPercent: null,
      fastestGrowingLabel: null,
      fastestGrowingBytes: 0,
      fastestGrowingDeltaBytes: 0,
      fastestGrowingDeltaPercent: null,
      businessContributions: emptyBusinessContributions,
      contributionHighlights: [],
    };
  }

  return {
    quotaBytes: payload.quotaBytes ?? 0,
    quotaLabel: payload.quotaLabel ?? "0 B",
    totalBytes: payload.totalBytes ?? 0,
    totalLabel: payload.totalLabel ?? "0 B",
    remainingBytes: payload.remainingBytes ?? 0,
    remainingLabel: payload.remainingLabel ?? "0 B",
    usagePercent: payload.usagePercent ?? 0,
    objectCount: payload.objectCount ?? 0,
    snapshotCount: payload.snapshotCount ?? 0,
    latestSnapshotMonth: payload.latestSnapshotMonth ?? null,
    deltaBytes: payload.deltaBytes ?? 0,
    deltaPercent: payload.deltaPercent ?? null,
    topBucketLabel: payload.topBucketLabel ?? null,
    topBucketBytes: payload.topBucketBytes ?? 0,
    topExtensionLabel: payload.topExtensionLabel ?? null,
    topExtensionBytes: payload.topExtensionBytes ?? 0,
    topContributionLabel: payload.topContributionLabel ?? null,
    topContributionBytes: payload.topContributionBytes ?? 0,
    topContributionSharePercent: payload.topContributionSharePercent ?? 0,
    topContributionDeltaBytes: payload.topContributionDeltaBytes ?? 0,
    topContributionDeltaPercent: payload.topContributionDeltaPercent ?? null,
    fastestGrowingLabel: payload.fastestGrowingLabel ?? null,
    fastestGrowingBytes: payload.fastestGrowingBytes ?? 0,
    fastestGrowingDeltaBytes: payload.fastestGrowingDeltaBytes ?? 0,
    fastestGrowingDeltaPercent: payload.fastestGrowingDeltaPercent ?? null,
    businessContributions: {
      previousSnapshotMonth:
        payload.businessContributions?.previousSnapshotMonth ?? null,
      historyMonths: Array.isArray(payload.businessContributions?.historyMonths)
        ? payload.businessContributions.historyMonths
        : [],
      alerts: Array.isArray(payload.businessContributions?.alerts)
        ? payload.businessContributions.alerts
        : [],
      items: Array.isArray(payload.businessContributions?.items)
        ? payload.businessContributions.items.map((item) => ({
            ...item,
            currentAverageBytes: item.currentAverageBytes ?? 0,
            currentSharePercent: item.currentSharePercent ?? 0,
            previousBytes: item.previousBytes ?? 0,
            previousCount: item.previousCount ?? 0,
            deltaBytes: item.deltaBytes ?? 0,
            deltaPercent: item.deltaPercent ?? null,
            deltaCount: item.deltaCount ?? 0,
            cumulative3MonthBytes: item.cumulative3MonthBytes ?? 0,
            cumulative3MonthPercent: item.cumulative3MonthPercent ?? null,
            accelerationBytes: item.accelerationBytes ?? 0,
            accelerationPercent: item.accelerationPercent ?? null,
            history: Array.isArray(item.history) ? item.history : [],
            topFiles: Array.isArray(item.topFiles) ? item.topFiles : [],
            mimeSubtypes: Array.isArray(item.mimeSubtypes) ? item.mimeSubtypes : [],
            alerts: Array.isArray(item.alerts) ? item.alerts : [],
          }))
        : [],
    },
    growthHighlights: Array.isArray(payload.growthHighlights) ? payload.growthHighlights : [],
    contributionHighlights: Array.isArray(payload.contributionHighlights)
      ? payload.contributionHighlights
      : [],
  };
}

function normalizeServiceThresholdAlerts(
  payload: GovernanceMonthlyReportPayload["serviceThresholdAlerts"] | null | undefined,
): GovernanceMonthlyReportPayload["serviceThresholdAlerts"] {
  return Array.isArray(payload) ? payload : [];
}

function normalizePayload(
  payload: GovernanceMonthlyReportPayload,
): GovernanceMonthlyReportPayload {
  return {
    ...payload,
    artifacts: payload.artifacts
      ? {
          pdfStoragePath: payload.artifacts.pdfStoragePath ?? null,
          pdfGeneratedAt: payload.artifacts.pdfGeneratedAt ?? null,
        }
      : undefined,
    impact: normalizeGovernanceImpactPayload(payload.impact),
    projectSignals: normalizeProjectSignals(payload.projectSignals),
    storage: normalizeStoragePayload(payload.storage),
    serviceThresholdAlerts: normalizeServiceThresholdAlerts(payload.serviceThresholdAlerts),
  };
}

const FILE_PATH = join(process.cwd(), "data", "local-db", "governance_monthly_reports.json");
export const GOVERNANCE_MONTHLY_REPORT_KEY = "cleanmymap-governance";

async function readStore(): Promise<GovernanceMonthlyReportStore> {
  return readLocalRecordStore(FILE_PATH, normalizeStoredReport);
}

async function writeStore(store: GovernanceMonthlyReportStore): Promise<void> {
  await writeLocalRecordStore(FILE_PATH, store.records);
}

function normalizeReportMonth(value: string): string {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString().slice(0, 10)
    : parsed.toISOString().slice(0, 10);
}
function normalizeStoredReport(
  record: Record<string, unknown>,
): GovernanceMonthlyReportRecord | null {
  const stringFields = ["id", "reportKey", "reportMonth", "generatedAt", "version", "title"] as const;
  if (stringFields.some((field) => typeof record[field] !== "string")) {
    return null;
  }
  if (!record.payload || typeof record.payload !== "object" || Array.isArray(record.payload)) {
    return null;
  }
  return {
    id: record.id as string,
    reportKey: record.reportKey as string,
    reportMonth: normalizeReportMonth(record.reportMonth as string),
    generatedAt: record.generatedAt as string,
    version: record.version as string,
    title: record.title as string,
    payload: normalizePayload(record.payload as GovernanceMonthlyReportPayload),
  };
}

function getReportMonthRange(value: string): { start: string; end: string } {
  const parsed = new Date(`${normalizeReportMonth(value)}T00:00:00.000Z`);
  const year = parsed.getUTCFullYear();
  const month = parsed.getUTCMonth();
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const end = new Date(Date.UTC(year, month + 1, 1)).toISOString().slice(0, 10);

  return { start, end };
}

function toRecord(row: GovernanceMonthlyReportRow): GovernanceMonthlyReportRecord {
  return {
    id: String(row.id),
    reportKey: row.report_key,
    reportMonth: normalizeReportMonth(row.report_month),
    generatedAt: row.generated_at,
    version: row.version,
    title: row.title,
    payload: normalizePayload(row.payload),
  };
}

async function readSupabaseRecords(limit: number): Promise<GovernanceMonthlyReportRecord[]> {
    const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from("governance_monthly_reports")
    .select("id,report_key,report_month,generated_at,version,title,payload")
    .eq("report_key", GOVERNANCE_MONTHLY_REPORT_KEY)
    .order("report_month", { ascending: false })
    .limit(limit);

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []).map((row) => toRecord(row as GovernanceMonthlyReportRow));
}

async function readSupabaseReport(
  reportMonth?: string | null,
): Promise<GovernanceMonthlyReportRecord | null> {
    const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("governance_monthly_reports")
    .select("id,report_key,report_month,generated_at,version,title,payload")
    .eq("report_key", GOVERNANCE_MONTHLY_REPORT_KEY);

  if (reportMonth) {
    const monthRange = getReportMonthRange(reportMonth);
    query = query
      .gte("report_month", monthRange.start)
      .lt("report_month", monthRange.end)
      .order("report_month", { ascending: false })
      .limit(1);
  } else {
    query = query.order("report_month", { ascending: false }).limit(1);
  }

  const result = await query;

  if (result.error) {
    throw new Error(result.error.message);
  }

  const row = result.data?.[0];
  return row ? toRecord(row as GovernanceMonthlyReportRow) : null;
}

export async function upsertGovernanceMonthlyReport(
  record: GovernanceMonthlyReportRecord,
): Promise<void> {
  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseAdminClient();
      const result = await supabase.from("governance_monthly_reports").upsert(
        {
          report_key: record.reportKey,
          report_month: record.reportMonth,
          generated_at: record.generatedAt,
          version: record.version,
          title: record.title,
          payload: record.payload,
        },
        { onConflict: "report_key,report_month" },
      );
      if (!result.error) {
        return;
      }
      if (!allowLocalFileStoreFallback()) {
        return;
      }
    } catch {
      if (!allowLocalFileStoreFallback()) {
        return;
      }
    }
  }

  const store = await readStore();
  const nextRecords = store.records.filter(
    (entry) =>
      !(
        entry.reportKey === record.reportKey &&
        entry.reportMonth === record.reportMonth
      ),
  );
  nextRecords.unshift(record);
  await writeStore({
    updatedAt: new Date().toISOString(),
    records: nextRecords.slice(0, 24),
  });
}

export async function listGovernanceMonthlyReports(
  limit = 12,
): Promise<GovernanceMonthlyReportRecord[]> {
  if (canUseSupabaseServerPersistence()) {
    try {
      return await readSupabaseRecords(limit);
    } catch {
      if (!allowLocalFileStoreFallback()) {
        return [];
      }
    }
  }

  const store = await readStore();
  return store.records
    .filter((entry) => entry.reportKey === GOVERNANCE_MONTHLY_REPORT_KEY)
    .sort((a, b) => b.reportMonth.localeCompare(a.reportMonth))
    .slice(0, limit);
}

export async function loadGovernanceMonthlyReport(
  reportMonth?: string | null,
): Promise<GovernanceMonthlyReportRecord | null> {
  if (canUseSupabaseServerPersistence()) {
    try {
      return await readSupabaseReport(reportMonth);
    } catch {
      if (!allowLocalFileStoreFallback()) {
        return null;
      }
    }
  }

  const reports = await listGovernanceMonthlyReports(24);
  if (!reportMonth) {
    return reports[0] ?? null;
  }

  const normalized = normalizeReportMonth(reportMonth);
  return (
    reports.find((report) => report.reportMonth === normalized) ??
    reports.find((report) => report.reportMonth.startsWith(normalized.slice(0, 7))) ??
    null
  );
}

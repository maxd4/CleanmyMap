import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { allowLocalFileStoreFallback, canUseSupabaseServerPersistence } from "@/lib/persistence/runtime-store";
import type { ServiceThresholdAlert } from "@/lib/environmental-impact-estimator/service-risk";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { StorageBusinessContributionReport } from "@/lib/supabase/storage-business-contribution";

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
      currentKgCo2eProxy: number;
      previousKgCo2eProxy: number;
      deltaKgCo2eProxy: number;
    }>;
    growthHighlights: Array<{
      label: string;
      previousKgCo2eProxy: number;
      currentKgCo2eProxy: number;
      deltaKgCo2eProxy: number;
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

type GovernanceMonthlyReportStore = {
  updatedAt: string;
  records: GovernanceMonthlyReportRecord[];
};

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

function normalizeImpactPayload(
  payload: GovernanceMonthlyReportPayload["impact"] | null | undefined,
): GovernanceMonthlyReportPayload["impact"] {
  if (!payload) {
    return {
      monthlyKgCo2eProxy: null,
      confidencePercent: null,
      snapshotCount: 0,
      latestSnapshotDate: null,
      topServiceLabel: null,
      topServiceMonthlyKgCo2eProxy: null,
      topServiceDeltaKgCo2eProxy: null,
      serviceBreakdown: [],
      growthHighlights: [],
    };
  }

  return {
    monthlyKgCo2eProxy: payload.monthlyKgCo2eProxy ?? null,
    confidencePercent: payload.confidencePercent ?? null,
    snapshotCount: payload.snapshotCount ?? 0,
    latestSnapshotDate: payload.latestSnapshotDate ?? null,
    topServiceLabel: payload.topServiceLabel ?? null,
    topServiceMonthlyKgCo2eProxy: payload.topServiceMonthlyKgCo2eProxy ?? null,
    topServiceDeltaKgCo2eProxy: payload.topServiceDeltaKgCo2eProxy ?? null,
    serviceBreakdown: Array.isArray(payload.serviceBreakdown)
      ? payload.serviceBreakdown.map((item) => ({
          key: typeof item.key === "string" ? item.key : "",
          label: typeof item.label === "string" ? item.label : "",
          currentKgCo2eProxy: item.currentKgCo2eProxy ?? 0,
          previousKgCo2eProxy: item.previousKgCo2eProxy ?? 0,
          deltaKgCo2eProxy: item.deltaKgCo2eProxy ?? 0,
        }))
      : [],
    growthHighlights: Array.isArray(payload.growthHighlights) ? payload.growthHighlights : [],
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
    impact: normalizeImpactPayload(payload.impact),
    projectSignals: normalizeProjectSignals(payload.projectSignals),
    storage: normalizeStoragePayload(payload.storage),
    serviceThresholdAlerts: normalizeServiceThresholdAlerts(payload.serviceThresholdAlerts),
  };
}

const FILE_PATH = join(process.cwd(), "data", "local-db", "governance_monthly_reports.json");
export const GOVERNANCE_MONTHLY_REPORT_KEY = "cleanmymap-governance";

function emptyStore(): GovernanceMonthlyReportStore {
  return { updatedAt: new Date().toISOString(), records: [] };
}

async function readStore(): Promise<GovernanceMonthlyReportStore> {
  try {
    const raw = await readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as GovernanceMonthlyReportStore;
    if (!parsed || !Array.isArray(parsed.records)) {
      return emptyStore();
    }

    return {
      updatedAt:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
      records: parsed.records,
    };
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: GovernanceMonthlyReportStore): Promise<void> {
  await mkdir(dirname(FILE_PATH), { recursive: true });
  await writeFile(FILE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function normalizeReportMonth(value: string): string {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
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
  const supabase = getSupabaseServerClient();
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

export async function upsertGovernanceMonthlyReport(
  record: GovernanceMonthlyReportRecord,
): Promise<void> {
  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient();
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

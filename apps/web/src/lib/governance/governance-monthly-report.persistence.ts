import { Buffer } from "node:buffer";
import { buildSimplePdf } from "@/lib/pdf-export/simple-pdf";
import type { EnvironmentalImpactCaptureResult } from "@/lib/environmental-impact-estimator/dashboard-capture";
import { buildStorageBusinessMetadata } from "@/lib/supabase/storage-business-classification";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { StorageUsageReport } from "@/lib/supabase/storage-usage-service";
import { buildGovernanceMonthlyReportLines, buildGovernanceMonthlyReportFilename } from "./governance-monthly-report.render";
import {
  buildGovernanceMonthlyReportPayload,
} from "./governance-monthly-report.model";
import {
  GOVERNANCE_MONTHLY_REPORT_KEY,
  listGovernanceMonthlyReports,
  upsertGovernanceMonthlyReport,
  type GovernanceMonthlyReportRecord,
} from "./governance-monthly-report-store";

export const GOVERNANCE_MONTHLY_REPORT_VERSION = "governance-monthly-report-2026.05-v1";
const GOVERNANCE_MONTHLY_REPORT_PDF_BUCKET = "reports";

function buildGovernanceMonthlyReportPdfPath(reportMonth: string): string {
  return `governance-monthly/${buildGovernanceMonthlyReportFilename(reportMonth)}`;
}

async function bestEffort<T>(fallback: T, task: () => Promise<T>): Promise<T> {
  try {
    return await task();
  } catch {
    return fallback;
  }
}

async function persistGovernanceMonthlyReportPdf(record: GovernanceMonthlyReportRecord): Promise<string | null> {
  const supabase = getSupabaseServerClient();
  const recentReports = await listGovernanceMonthlyReports(3);
  const pdfBytes = buildSimplePdf(buildGovernanceMonthlyReportLines(record, recentReports));
  const pdfPath = buildGovernanceMonthlyReportPdfPath(record.reportMonth);
  const pdfBlob = new Blob([Buffer.from(pdfBytes)], { type: "application/pdf" });
  const { error } = await supabase.storage.from(GOVERNANCE_MONTHLY_REPORT_PDF_BUCKET).upload(
    pdfPath,
    pdfBlob,
    {
      upsert: true,
      cacheControl: "3600",
      metadata: buildStorageBusinessMetadata({
        businessDomain: "socle_estimateur_impact",
        sourceTable: "governance_monthly_reports",
        businessContext: "governance_report",
        extra: {
          reportMonth: record.reportMonth,
          version: record.version,
        },
      }),
    },
  );

  return error ? null : pdfPath;
}

export async function captureGovernanceMonthlyReport(params: {
  environmentalImpact: EnvironmentalImpactCaptureResult;
  storageUsage: StorageUsageReport;
  generatedAt?: string;
}): Promise<GovernanceMonthlyReportRecord> {
  const payload = buildGovernanceMonthlyReportPayload(params);
  const record: GovernanceMonthlyReportRecord = {
    id: `governance-${payload.reportMonth}`,
    reportKey: GOVERNANCE_MONTHLY_REPORT_KEY,
    reportMonth: payload.reportMonth,
    generatedAt: payload.generatedAt,
    version: GOVERNANCE_MONTHLY_REPORT_VERSION,
    title: "Rapport mensuel de gouvernance",
    payload,
  };

  await upsertGovernanceMonthlyReport(record);

  const pdfStoragePath = await bestEffort<string | null>(null, () =>
    persistGovernanceMonthlyReportPdf(record),
  );

  if (!pdfStoragePath) {
    return record;
  }

  const recordWithAsset: GovernanceMonthlyReportRecord = {
    ...record,
    payload: {
      ...record.payload,
      artifacts: {
        pdfStoragePath,
        pdfGeneratedAt: record.generatedAt,
      },
    },
  };

  await upsertGovernanceMonthlyReport(recordWithAsset);
  return recordWithAsset;
}

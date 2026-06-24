import { NextResponse } from "next/server";
import { hasValidCronAuth, isCronSecretConfigured } from "@/lib/http/cron-auth";
import { captureEnvironmentalImpactDashboard } from "@/lib/environmental-impact-estimator/dashboard-capture";
import { captureGovernanceMonthlyReport } from "@/lib/governance/governance-monthly-report";
import { captureStorageUsageReport } from "@/lib/supabase/storage-usage-service";

export const runtime = "nodejs";

function unauthorizedResponse() {
  return NextResponse.json(
    {
      status: "error",
      error: "Unauthorized",
      hint: "Configure CRON_SECRET in Vercel and keep the cron route private.",
    },
    { status: 401 },
  );
}

export async function GET(request: Request) {
  if (!isCronSecretConfigured() || !hasValidCronAuth(request)) {
    return unauthorizedResponse();
  }

  try {
    const report = await captureStorageUsageReport();
    let governanceReport: Awaited<ReturnType<typeof captureGovernanceMonthlyReport>> | null =
      null;
    let governanceWarning: string | null = null;

    try {
      const environmentalImpact = await captureEnvironmentalImpactDashboard({
        userId: null,
        historyLimit: 12,
      });
      governanceReport = await captureGovernanceMonthlyReport({
        environmentalImpact,
        storageUsage: report,
        generatedAt: report.timestamp,
      });
    } catch {
      governanceWarning = "Impossible d'enregistrer le rapport mensuel de gouvernance.";
    }

    const warnings = [
      ...report.warnings,
      ...(governanceWarning ? [governanceWarning] : []),
    ];
    const status =
      report.current.usagePercent >= 100 || warnings.length > 0
        ? "degraded"
        : "ok";

    return NextResponse.json({
      status,
      ...report,
      warnings,
      governanceReport: governanceReport
        ? {
            reportMonth: governanceReport.reportMonth,
            generatedAt: governanceReport.generatedAt,
            title: governanceReport.title,
          }
        : null,
      triggeredBy: "vercel-cron",
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        error: "Impossible d'exécuter la capture mensuelle du stockage.",
        details: "Unavailable",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}

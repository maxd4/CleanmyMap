import { NextResponse } from "next/server";
import { hasValidCronAuth, isCronSecretConfigured } from "@/lib/http/cron-auth";
import { cronUnauthorizedResponse } from "@/lib/http/cron-auth-response";
import { captureStorageUsageReport } from "@/lib/supabase/storage-usage-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isCronSecretConfigured() || !hasValidCronAuth(request)) {
    return cronUnauthorizedResponse();
  }

  try {
    const report = await captureStorageUsageReport();
    const warnings = report.warnings;
    const status =
      report.current.usagePercent >= 100 || warnings.length > 0
        ? "degraded"
        : "ok";

    return NextResponse.json({
      status,
      ...report,
      warnings,
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

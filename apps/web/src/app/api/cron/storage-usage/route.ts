import { NextResponse } from "next/server";
import { captureStorageUsageReport } from "@/lib/supabase/storage-usage-service";
import { hasValidCronAuth, isCronSecretConfigured } from "@/lib/http/cron-auth";

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
    const status =
      report.current.usagePercent >= 100 || report.warnings.length > 0
        ? "degraded"
        : "ok";

    return NextResponse.json({
      status,
      ...report,
      triggeredBy: "vercel-cron",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        status: "error",
        error: "Impossible d'exécuter la capture mensuelle du stockage.",
        details: message,
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}

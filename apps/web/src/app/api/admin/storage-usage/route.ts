import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { captureStorageUsageReport } from "@/lib/supabase/storage-usage-service";

export const runtime = "nodejs";

export async function GET() {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
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
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        error: "Impossible de charger le suivi du stockage Supabase.",
        details: "Unavailable",
      },
      { status: 503 },
    );
  }
}

export async function POST() {
  return GET();
}

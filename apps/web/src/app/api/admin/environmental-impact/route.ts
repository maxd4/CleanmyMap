import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { captureEnvironmentalImpactDashboard } from "@/lib/environmental-impact-estimator/dashboard-capture";

export const runtime = "nodejs";

function parseHistoryLimit(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 12;
  }
  return Math.min(24, Math.max(4, Math.trunc(parsed)));
}

export async function POST(request: Request) {
  const operationId = `env-impact-${Date.now()}`;
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access, operationId);
  }

  const url = new URL(request.url);
  const historyLimit = parseHistoryLimit(url.searchParams.get("historyLimit"));

  try {
    const result = await captureEnvironmentalImpactDashboard({
      userId: null,
      historyLimit,
    });

    return NextResponse.json({
      ...result,
      triggeredBy: "admin-manual",
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        error: "Impossible de déclencher la capture manuelle de l'impact environnemental.",
        details: "Unavailable",
      },
      { status: 503 },
    );
  }
}

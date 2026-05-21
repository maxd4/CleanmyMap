import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { loadEnvironmentalImpactDashboard } from "@/lib/environmental-impact-estimator/dashboard-capture";

export const runtime = "nodejs";

function parseHistoryLimit(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 8;
  }

  return Math.min(12, Math.max(4, Math.trunc(parsed)));
}

export async function GET(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }

  const url = new URL(request.url);
  const historyLimit = parseHistoryLimit(url.searchParams.get("historyLimit"));

  try {
    const result = await loadEnvironmentalImpactDashboard({
      userId: null,
      historyLimit,
    });

    return NextResponse.json({
      ...result,
      focus: "free-tier-services",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        status: "error",
        error: "Impossible de charger la fiche des services en plan gratuit.",
        details: message,
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}

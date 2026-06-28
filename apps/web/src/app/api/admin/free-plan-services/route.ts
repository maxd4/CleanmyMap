import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { loadEnvironmentalImpactDashboardSnapshotOnly } from "@/lib/environmental-impact-estimator/dashboard-capture";

export const runtime = "nodejs";
const FREE_PLAN_SERVICES_CACHE_HEADERS = {
  "Cache-Control": "private, max-age=300, stale-while-revalidate=3600",
};

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
    const result = await loadEnvironmentalImpactDashboardSnapshotOnly({ historyLimit });

    if (!result) {
      return NextResponse.json(
        {
          status: "error",
          error: "Aucun snapshot d'impact environnemental n'est encore disponible.",
          details: "Unavailable",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        ...result,
        focus: "free-tier-services",
      },
      {
        headers: FREE_PLAN_SERVICES_CACHE_HEADERS,
      },
    );
  } catch {
    return NextResponse.json(
      {
        status: "error",
        error: "Impossible de charger la fiche des services en plan gratuit.",
        details: "Unavailable",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { captureEnvironmentalImpactDashboard } from "@/lib/environmental-impact-estimator/dashboard-capture";

export const runtime = "nodejs";

function parseHistoryLimit(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 8;
  }
  return Math.min(24, Math.max(4, Math.trunc(parsed)));
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse({
      hint: "Connectez-vous pour consulter l'estimateur d'impact CleanMyMap.",
    });
  }

  const url = new URL(request.url);
  const historyLimit = parseHistoryLimit(url.searchParams.get("historyLimit"));
  const generatedAt = new Date().toISOString();

  try {
    const result = await captureEnvironmentalImpactDashboard({
      userId,
      generatedAt,
      historyLimit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[EnvironmentalImpact API] Failed to load project signals", error);
    return NextResponse.json(
      {
        status: "error",
        error: "Impossible de calculer l'estimateur d'impact environnemental.",
      },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { hasValidCronAuth, isCronSecretConfigured } from "@/lib/http/cron-auth";
import { cronUnauthorizedResponse } from "@/lib/http/cron-auth-response";
import { captureEnvironmentalImpactDashboard } from "@/lib/environmental-impact-estimator/dashboard-capture";
import { parseEnvironmentalImpactHistoryLimit } from "@/lib/environmental-impact-estimator/history-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isCronSecretConfigured() || !hasValidCronAuth(request)) {
    return cronUnauthorizedResponse();
  }

  const url = new URL(request.url);
  const historyLimit = parseEnvironmentalImpactHistoryLimit(url.searchParams.get("historyLimit"));

  try {
    const result = await captureEnvironmentalImpactDashboard({
      userId: null,
      historyLimit,
    });

    return NextResponse.json({
      ...result,
      triggeredBy: "vercel-cron",
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        error: "Impossible d'exécuter la capture automatique de l'impact environnemental.",
        details: "Unavailable",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}

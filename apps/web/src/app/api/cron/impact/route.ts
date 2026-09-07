import { NextResponse } from "next/server";
import { generateAndPersistPublicImpactSnapshot } from "@/lib/impact/public-impact-snapshot";
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

  const force = new URL(request.url).searchParams.get("force") === "true";

  try {
    const result = await generateAndPersistPublicImpactSnapshot({ force });

    return NextResponse.json({
      status: "ok",
      snapshot: {
        key: result.snapshot.snapshotKey,
        date: result.snapshot.snapshotDate,
        generatedAt: result.snapshot.generatedAt,
        version: result.snapshot.version,
        period: result.snapshot.payload.period,
        methodologyVersion: result.snapshot.payload.methodologyVersion,
      },
      persisted: result.persisted,
      reused: result.reused,
      forced: result.forced,
      triggeredBy: "vercel-cron",
    });
  } catch (error) {
    console.error(
      "[cron/impact] Monthly public impact snapshot generation failed.",
      error instanceof Error ? error.message : "Unknown failure",
    );

    return NextResponse.json(
      {
        status: "error",
        error: "Impossible de générer le snapshot mensuel Impact terrain.",
        details: "Unavailable",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}

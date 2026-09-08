import { NextResponse } from "next/server";
import { hasValidCronAuth, isCronSecretConfigured } from "@/lib/http/cron-auth";
import {
  MAINTENANCE_CRON_PATH,
  MAINTENANCE_CRON_SCHEDULE,
  MAINTENANCE_CRON_TIMEZONE,
} from "@/lib/periodic/maintenance-cron-contract";
import { runMaintenanceJobs } from "@/lib/periodic/maintenance-job-registry";

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

  const result = await runMaintenanceJobs();

  return NextResponse.json({
    ...result,
    scheduler: {
      path: MAINTENANCE_CRON_PATH,
      schedule: MAINTENANCE_CRON_SCHEDULE,
      timezone: MAINTENANCE_CRON_TIMEZONE,
    },
    triggeredBy: "vercel-cron",
  });
}

export async function POST(request: Request) {
  return GET(request);
}

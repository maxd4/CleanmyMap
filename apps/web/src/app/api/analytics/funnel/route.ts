import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import {
  appendFunnelEvent,
  listFunnelEvents,
} from "@/lib/analytics/funnel-store";
import { computeFunnelMetricsWithBaseline } from "@/lib/analytics/funnel-metrics";

export const runtime = "nodejs";

const payloadSchema = z.object({
  sessionId: z.string().min(6).max(120).optional(),
  step: z.enum(["view_new", "start_form", "submit_success"]),
  mode: z.enum(["quick", "complete"]),
  meta: z.record(z.string(), z.unknown()).optional(),
});

function parsePeriodDays(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 30;
  }
  if (parsed <= 30) return 30;
  if (parsed <= 90) return 90;
  return 365;
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { userId } = await auth();
  await appendFunnelEvent({
    at: new Date().toISOString(),
    sessionId: parsed.data.sessionId ?? randomUUID(),
    userId: userId ?? null,
    step: parsed.data.step,
    mode: parsed.data.mode,
    meta: parsed.data.meta,
  });
  return NextResponse.json({ status: "ok" });
}

export async function GET(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }

  const url = new URL(request.url);
  const periodDays = parsePeriodDays(url.searchParams.get("periodDays"));
  const records = await listFunnelEvents(periodDays * 2);
  const computed = computeFunnelMetricsWithBaseline({ records, periodDays });

  return NextResponse.json({
    status: "ok",
    periodDays,
    generatedAt: new Date().toISOString(),
    recordsCount: records.length,
    metrics: computed.current,
    previous: computed.previous,
    baseline: computed.baseline,
  });
}

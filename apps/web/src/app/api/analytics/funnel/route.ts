import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { appendFunnelEvent, listFunnelEvents } from "@/lib/analytics/funnel-store";
import { computeFunnelMetricsWithBaseline } from "@/lib/analytics/funnel-metrics";
import { loadOrRefreshPublicSurfaceSnapshot } from "@/lib/public-surface-snapshot-service";

export const runtime = "nodejs";

const FUNNEL_SNAPSHOT_TTL_MINUTES = 60;
const FUNNEL_SNAPSHOT_VERSION = "public-analytics-funnel-v1";

const funnelEventSchema = z.object({
  sessionId: z.string().min(6).max(120).optional(),
  at: z.string().datetime().optional(),
  step: z.enum(["view_new", "page_view", "start_form", "submit_success"]),
  mode: z.enum(["quick", "complete"]),
  meta: z.record(z.string(), z.unknown()).optional(),
});

const payloadSchema = z.union([
  funnelEventSchema,
  z.object({
    sessionId: z.string().min(6).max(120).optional(),
    events: z.array(funnelEventSchema.omit({ sessionId: true })).min(1).max(100),
  }),
]);

type FunnelPayload = z.infer<typeof payloadSchema>;

function parsePeriodDays(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 30;
  }
  if (parsed <= 30) return 30;
  if (parsed <= 90) return 90;
  return 365;
}

function normalizeEvents(payload: FunnelPayload): Array<{
  at: string;
  sessionId: string;
  step: "view_new" | "page_view" | "start_form" | "submit_success";
  mode: "quick" | "complete";
  meta?: Record<string, unknown>;
}> {
  if ("events" in payload) {
    const sessionId = payload.sessionId ?? randomUUID();
    return payload.events.map((event) => ({
      at: event.at ?? new Date().toISOString(),
      sessionId,
      step: event.step,
      mode: event.mode,
      meta: event.meta,
    }));
  }

  return [
    {
      at: payload.at ?? new Date().toISOString(),
      sessionId: payload.sessionId ?? randomUUID(),
      step: payload.step,
      mode: payload.mode,
      meta: payload.meta,
    },
  ];
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
  const events = normalizeEvents(parsed.data);
  for (const event of events) {
    await appendFunnelEvent({
      at: event.at,
      sessionId: event.sessionId,
      userId: userId ?? null,
      step: event.step,
      mode: event.mode,
      meta: event.meta,
    });
  }

  return NextResponse.json({ status: "ok", count: events.length });
}

export async function GET(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }

  try {
    const url = new URL(request.url);
    const periodDays = parsePeriodDays(url.searchParams.get("periodDays"));
    const snapshot = await loadOrRefreshPublicSurfaceSnapshot({
      snapshotKey: `analytics-funnel:${periodDays}`,
      title: "Tunnel analytique",
      version: FUNNEL_SNAPSHOT_VERSION,
      ttlMinutes: FUNNEL_SNAPSHOT_TTL_MINUTES,
      buildPayload: async () => {
        const records = await listFunnelEvents(periodDays * 2);
        const computed = computeFunnelMetricsWithBaseline({
          records,
          periodDays,
        });

        return {
          status: "ok" as const,
          periodDays,
          generatedAt: new Date().toISOString(),
          recordsCount: records.length,
          metrics: computed.current,
          previous: computed.previous,
          baseline: computed.baseline,
        };
      },
      meta: {
        route: "api/analytics/funnel",
        periodDays,
      },
    });

    return NextResponse.json(snapshot.payload);
  } catch (error) {
    return handleApiError(error, "GET /api/analytics/funnel");
  }
}

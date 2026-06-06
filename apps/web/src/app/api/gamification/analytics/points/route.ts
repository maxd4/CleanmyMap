import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import {
  getTimeScopeFloorDate,
  getTimeScopeLabel,
  resolveTimeScopeFromRequest,
  type TimeScope,
} from "@/lib/time-scopes";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  const { searchParams } = new URL(request.url);
  const daysParam = searchParams.get("days");

  try {
    const supabase = getSupabaseServerClient();
    const scopeQuery = resolveTimeScopeFromRequest({
      scope: searchParams.get("scope"),
      days: daysParam,
      fallback: "rolling30d",
    });
    const scope: TimeScope = scopeQuery.scope;
    const dateFloor = getTimeScopeFloorDate(scope);

    // Fetch points transactions
    let query = supabase
      .from("points_ledger")
      .select("transaction_type, amount, source_event, created_at")
      .eq("user_id", userId);

    if (dateFloor) {
      query = query.gte("created_at", `${dateFloor}T00:00:00Z`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return handleApiError(error, "GET /api/gamification/analytics/points");
    }

    // Aggregate by source event
    const eventBreakdown = new Map<string, { count: number; points: number }>();
    let totalPoints = 0;

    (data ?? []).forEach((row: any) => {
      const event = row.source_event ?? "unknown";
      const current = eventBreakdown.get(event) ?? { count: 0, points: 0 };
      current.count += 1;
      current.points += row.amount ?? 0;
      eventBreakdown.set(event, current);
      totalPoints += row.amount ?? 0;
    });

    // Build timeline by day
    const timeline = new Map<string, number>();
    (data ?? []).forEach((row: any) => {
      const date = row.created_at.slice(0, 10);
      const current = timeline.get(date) ?? 0;
      timeline.set(date, current + (row.amount ?? 0));
    });

    const timelineArray = Array.from(timeline.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, points]) => ({ date, points }));

    return NextResponse.json({
      status: "ok",
      scope,
      scopeLabel: getTimeScopeLabel(scope),
      days: scopeQuery.days,
      totalPoints,
      eventBreakdown: Object.fromEntries(eventBreakdown),
      timeline: timelineArray,
      transactionCount: data?.length ?? 0,
    });
  } catch (error) {
    return handleApiError(error, "GET /api/gamification/analytics/points");
  }
}

import { NextResponse } from "next/server";
import { ACTION_STATUSES } from "@/lib/actions/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function parseStatusParam(raw: string | null): string | null {
  if (!raw) {
    return null;
  }
  return ACTION_STATUSES.includes(raw as (typeof ACTION_STATUSES)[number]) ? raw : null;
}

function parsePositiveInteger(raw: string | null, min: number, max: number, fallback: number): number {
  if (raw === null || raw.trim() === "") {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function buildDateFloor(daysWindow: number): string {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  now.setUTCDate(now.getUTCDate() - (daysWindow - 1));
  return now.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = parsePositiveInteger(url.searchParams.get("limit"), 1, 300, 80);
  const days = parsePositiveInteger(url.searchParams.get("days"), 1, 3650, 30);
  const status = parseStatusParam(url.searchParams.get("status"));
  const floorDate = buildDateFloor(days);

  try {
    const supabase = getSupabaseServerClient();
    let query = supabase
      .from("actions")
      .select("id, action_date, location_label, latitude, longitude, waste_kg, cigarette_butts, status")
      .gte("action_date", floorDate)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .order("action_date", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      status: "ok",
      count: data?.length ?? 0,
      daysWindow: days,
      items: data ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

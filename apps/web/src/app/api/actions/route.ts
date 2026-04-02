import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ACTION_STATUSES } from "@/lib/actions/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createActionSchema } from "@/lib/validation/action";

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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = parsePositiveInteger(url.searchParams.get("limit"), 1, 200, 30);
  const status = parseStatusParam(url.searchParams.get("status"));

  try {
    const supabase = getSupabaseServerClient();
    let query = supabase
      .from("actions")
      .select(
        "id, created_at, actor_name, action_date, location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count, duration_minutes, notes, status",
      )
      .order("action_date", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "ok", count: data?.length ?? 0, items: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = createActionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseServerClient();
    const toInsert = {
      created_by_clerk_id: userId,
      actor_name: parsed.data.actorName ?? null,
      action_date: parsed.data.actionDate,
      location_label: parsed.data.locationLabel,
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
      waste_kg: parsed.data.wasteKg,
      cigarette_butts: parsed.data.cigaretteButts,
      volunteers_count: parsed.data.volunteersCount,
      duration_minutes: parsed.data.durationMinutes,
      notes: parsed.data.notes ?? null,
      status: "pending",
    };

    const { data, error } = await supabase.from("actions").insert(toInsert).select("id").single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "created", id: data.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

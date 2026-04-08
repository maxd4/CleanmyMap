import { NextResponse } from "next/server";
import { z } from "zod";
import { ACTION_STATUSES } from "@/lib/actions/types";
import { requireAdminAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const importActionSchema = z.object({
  actorName: z.string().trim().min(1).max(200).optional(),
  actionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format YYYY-MM-DD"),
  locationLabel: z.string().trim().min(2).max(255),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  wasteKg: z.number().min(0).max(100000),
  cigaretteButts: z.number().int().min(0).max(100000000),
  volunteersCount: z.number().int().min(1).max(10000),
  durationMinutes: z.number().int().min(1).max(100000),
  notes: z.string().trim().max(2000).optional(),
  status: z.enum(ACTION_STATUSES).optional(),
});

const importPayloadSchema = z.object({
  items: z.array(importActionSchema).min(1).max(2000),
});

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = importPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const toInsert = parsed.data.items.map((item) => ({
    created_by_clerk_id: access.userId,
    actor_name: item.actorName ?? null,
    action_date: item.actionDate,
    location_label: item.locationLabel,
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    waste_kg: item.wasteKg,
    cigarette_butts: item.cigaretteButts,
    volunteers_count: item.volunteersCount,
    duration_minutes: item.durationMinutes,
    notes: item.notes ?? null,
    status: item.status ?? "approved",
  }));

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("actions").insert(toInsert).select("id");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        status: "imported",
        count: data?.length ?? 0,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

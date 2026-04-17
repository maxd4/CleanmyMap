import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserIdentity, pickTraceableActorName } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";

export const runtime = "nodejs";

const spotStatuses = ["new", "validated", "cleaned"] as const;
type SpotStatus = (typeof spotStatuses)[number];

const createSpotSchema = z.object({
  type: z.enum(["clean_place", "spot"]).default("spot"),
  label: z.string().trim().min(2).max(255),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  notes: z.string().trim().max(2000).optional(),
});

function parseStatusParam(raw: string | null): SpotStatus | null {
  if (!raw) {
    return null;
  }
  return spotStatuses.includes(raw as SpotStatus) ? (raw as SpotStatus) : null;
}

function parsePositiveInteger(
  raw: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
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
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  const url = new URL(request.url);
  const limit = parsePositiveInteger(
    url.searchParams.get("limit"),
    1,
    300,
    120,
  );
  const status = parseStatusParam(url.searchParams.get("status"));

  try {
    const supabase = getSupabaseServerClient();
    let query = supabase
      .from("spots")
      .select(
        "id, created_at, label, waste_type, latitude, longitude, status",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const result = await query;
    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      status: "ok",
      count: (result.data ?? []).length,
      items: result.data ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = createSpotSchema.safeParse(payload);
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
    const identity = await getCurrentUserIdentity();
    const actorName = pickTraceableActorName(identity, undefined) ?? userId;
    const notePrefix = `[spot-by:${actorName}]`;
    const composedNotes = parsed.data.notes?.trim()
      ? `${notePrefix} ${parsed.data.notes.trim()}`
      : notePrefix;

    const inserted = await supabase
      .from("spots")
      .insert({
        created_by_clerk_id: userId,
        label: parsed.data.label,
        waste_type: parsed.data.type,
        latitude: parsed.data.latitude ?? null,
        longitude: parsed.data.longitude ?? null,
        status: "new",
        notes: composedNotes,
      })
      .select(
        "id, created_at, label, waste_type, latitude, longitude, status, notes",
      )
      .single();

    if (inserted.error) {
      return NextResponse.json(
        { error: inserted.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { status: "created", source: "spots", item: inserted.data },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

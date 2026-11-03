import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { loadActionById } from "@/lib/actions/store";
import { isActionGeometryContributorEligible } from "@/lib/actions/geometry/action-geometry-contributor-eligibility";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Justification Vercel: bearer-authenticated mission creation must remain
// per-request and must never be cached across volunteers.
export const dynamic = "force-dynamic";

const createMissionSchema = z
  .object({
    actionId: z.string().uuid(),
    label: z.string().trim().min(1).max(200),
  })
  .strict();

const idempotencyKeyPattern = /^[A-Za-z0-9:_-]{16,160}$/;

function readIdempotencyKey(request: Request): string | null | Response {
  const value = request.headers.get("Idempotency-Key")?.trim() ?? "";
  if (!value) return null;
  if (!idempotencyKeyPattern.test(value)) {
    return NextResponse.json(
      { error: "La clé d'idempotence doit contenir entre 16 et 160 caractères alphanumériques." },
      { status: 422 },
    );
  }
  return value;
}

/**
 * Creates a mission already linked to an Action. The client supplies only the
 * requested Action id; the server checks the canonical observed-geometry
 * eligibility owner and writes action_id through the privileged boundary.
 */
export async function POST(request: Request) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const parsed = createMissionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "La mission liée doit préciser une action et un libellé valides." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient(true);
  const action = await loadActionById(supabase, parsed.data.actionId);
  if (!action) {
    return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
  }

  const isEligible = await isActionGeometryContributorEligible(supabase, {
    actionId: action.id,
    contributorClerkId: access.userId,
  });
  if (!isEligible) {
    return NextResponse.json(
      {
        error:
          "Vous devez être le créateur, l'organisateur, un participant confirmé ou une inscription confirmée de cette action.",
      },
      { status: 403 },
    );
  }

  const idempotencyKey = readIdempotencyKey(request);
  if (idempotencyKey instanceof Response) return idempotencyKey;

  if (idempotencyKey) {
    const existingResult = await supabase
      .from("missions")
      .select("id, volunteer_id, label, status, started_at, ended_at, distance_m, duration_s, created_at, action_id")
      .eq("volunteer_id", access.userId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existingResult.error) {
      return NextResponse.json({ error: "Impossible de vérifier la mission existante." }, { status: 500 });
    }
    if (existingResult.data) {
      if (existingResult.data.action_id !== action.id || existingResult.data.label !== parsed.data.label) {
        return NextResponse.json({ error: "Cette clé d'idempotence est déjà liée à une autre mission." }, { status: 409 });
      }
      return NextResponse.json({ mission: existingResult.data }, { status: 200 });
    }
  }

  const result = await supabase
    .from("missions")
    .insert({
      volunteer_id: access.userId,
      label: parsed.data.label,
      action_id: action.id,
      ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
    })
    .select("id, volunteer_id, label, status, started_at, ended_at, distance_m, duration_s, created_at, action_id")
    .single();

  if (result.error && idempotencyKey && result.error.code === "23505") {
    const retryResult = await supabase
      .from("missions")
      .select("id, volunteer_id, label, status, started_at, ended_at, distance_m, duration_s, created_at, action_id")
      .eq("volunteer_id", access.userId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (retryResult.error) {
      console.error("Linked mission idempotency collision lookup failed", retryResult.error);
      return NextResponse.json(
        { error: "Impossible de vérifier la mission concurrente." },
        { status: 500 },
      );
    }
    if (!retryResult.data) {
      console.error("Linked mission idempotency collision returned no mission");
      return NextResponse.json(
        { error: "Impossible de vérifier la mission concurrente." },
        { status: 500 },
      );
    }
    if (retryResult.data.action_id !== action.id || retryResult.data.label !== parsed.data.label) {
      return NextResponse.json({ error: "Cette clé d'idempotence est déjà liée à une autre mission." }, { status: 409 });
    }
    return NextResponse.json({ mission: retryResult.data }, { status: 200 });
  }
  if (result.error) {
    console.error("Linked mission creation failed", result.error);
    return NextResponse.json(
      { error: "Impossible de créer la mission GPS liée." },
      { status: 500 },
    );
  }

  return NextResponse.json({ mission: result.data }, { status: 201 });
}

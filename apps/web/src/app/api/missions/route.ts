import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
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

/**
 * Creates a mission already linked to an Action. The client supplies only the
 * requested Action id; the server checks the canonical observed-geometry
 * eligibility owner and writes action_id through the privileged boundary.
 */
export async function POST(request: Request) {
  const access = await requireAuthenticatedAccess();
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

  const result = await supabase
    .from("missions")
    .insert({
      volunteer_id: access.userId,
      label: parsed.data.label,
      action_id: action.id,
    })
    .select("id, volunteer_id, label, status, started_at, ended_at, distance_m, duration_s, created_at, action_id")
    .single();

  if (result.error) {
    console.error("Linked mission creation failed", result.error);
    return NextResponse.json(
      { error: "Impossible de créer la mission GPS liée." },
      { status: 500 },
    );
  }

  return NextResponse.json({ mission: result.data }, { status: 201 });
}

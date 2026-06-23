import { NextResponse } from "next/server";
import { getCurrentUserIdentity, requireAuthenticatedAccess } from "@/lib/authz";
import { listAdminOperationAudit } from "@/lib/admin/operation-audit";
import { loadActionOrganizerIdsForAction } from "@/lib/actions/organizers";
import { runSingleActionQuery } from "@/lib/actions/query";
import { isAdminLikeProfile } from "@/lib/profiles";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";

export const runtime = "nodejs";
// Justification Vercel: le journal d'audit dépend de l'action et de l'utilisateur, donc il ne doit pas être caché.
export const dynamic = "force-dynamic";

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

async function canViewActionAudit(params: {
  actionId: string;
  userId: string;
  creatorUserId: string | null;
  supabase: ReturnType<typeof getSupabaseServerClient>;
}): Promise<boolean> {
  const identity = await getCurrentUserIdentity();
  if (identity && isAdminLikeProfile(identity.role)) {
    return true;
  }

  if (params.creatorUserId?.trim() === params.userId) {
    return true;
  }

  const organizerIds = await loadActionOrganizerIdsForAction(
    params.supabase,
    params.actionId,
    null,
  );
  return organizerIds.includes(params.userId);
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }

  const url = new URL(request.url);
  const limit = parsePositiveInteger(url.searchParams.get("limit"), 1, 50, 12);
  const { actionId } = await ctx.params;
  const trimmedActionId = actionId.trim();

  if (!trimmedActionId) {
    return NextResponse.json(
      { error: "Identifiant d'action manquant." },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseServerClient();
    const actionResult = await runSingleActionQuery<{
      created_by_clerk_id: string | null;
    }>(supabase, (query) =>
      query.select("created_by_clerk_id").eq("id", trimmedActionId).maybeSingle(),
    );

    if (!actionResult) {
      return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
    }

    const allowed = await canViewActionAudit({
      actionId: trimmedActionId,
      userId: access.userId,
      creatorUserId: actionResult.created_by_clerk_id,
      supabase,
    });

    if (!allowed) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à lire ce journal." },
        { status: 403 },
      );
    }

    const items = await listAdminOperationAudit(limit, trimmedActionId);
    return NextResponse.json({ status: "ok", count: items.length, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Action Audit] Listing failed", {
      actionId: trimmedActionId,
      message,
    });
    return NextResponse.json(
      {
        error: "La lecture du journal a échoué.",
      },
      { status: 500 },
    );
  }
}

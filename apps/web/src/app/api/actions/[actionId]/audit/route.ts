import { NextResponse } from "next/server";
import { getCurrentUserIdentity, requireAuthenticatedAccess } from "@/lib/authz";
import { listAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import { loadActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { runSingleActionQuery } from "@/lib/actions/query";
import { canViewActionModerationAudit } from "@/lib/actions/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { parsePositiveInteger } from "@/lib/http/query-params";

export const runtime = "nodejs";
// Justification Vercel: le journal d'audit dépend de l'action et de l'utilisateur, donc il ne doit pas être caché.
export const dynamic = "force-dynamic";

async function canViewActionAudit(params: {
  actionId: string;
  userId: string;
  creatorUserId: string | null;
  supabase: ReturnType<typeof getSupabaseServerClient>;
  identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>;
}): Promise<boolean> {
  if (canViewActionModerationAudit(params.identity)) {
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

function projectUserActionHistory(
  entry: Awaited<ReturnType<typeof listAdminOperationAudit>>[number],
) {
  const operation =
    typeof entry.details.operation === "string"
      ? entry.details.operation
      : entry.operationType;

  return {
    at: entry.at,
    operation,
    outcome: entry.outcome,
  };
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
    const supabase = getSupabaseServerClient(true);
    const actionResult = await runSingleActionQuery<{
      created_by_clerk_id: string | null;
    }>(supabase, (query) =>
      query.select("created_by_clerk_id").eq("id", trimmedActionId).maybeSingle(),
    );

    if (!actionResult) {
      return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
    }

    const identity = await getCurrentUserIdentity();
    const allowed = await canViewActionAudit({
      actionId: trimmedActionId,
      userId: access.userId,
      creatorUserId: actionResult.created_by_clerk_id,
      supabase,
      identity,
    });

    if (!allowed) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à lire ce journal." },
        { status: 403 },
      );
    }

    const items = await listAdminOperationAudit(limit, trimmedActionId);
    const isFullModerationAudit = canViewActionModerationAudit(identity);
    const visibleItems = isFullModerationAudit
      ? items
      : items.map(projectUserActionHistory);
    return NextResponse.json({
      status: "ok",
      count: visibleItems.length,
      items: visibleItems,
    });
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

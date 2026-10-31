import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, parseJsonBodyWithValidation } from "@/lib/http/api-errors";
import {
  actionRetrospectiveDraftSchema,
} from "@/lib/actions/action-retrospective-contract";
import {
  loadActionRetrospectiveForActor,
  publishActionRetrospective,
  saveActionRetrospective,
} from "@/lib/actions/action-retrospectives";
import {
  loadRetrospectiveWriteContext,
  retrospectiveOperationError,
} from "./route-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RetrospectiveRouteContext = {
  params: Promise<{ actionId: string }>;
};

async function resolveRequestContext(
  ctx: RetrospectiveRouteContext,
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return { response: unauthorizedJsonResponse() } as const;

  const actionId = (await ctx.params).actionId.trim();
  if (!actionId) {
    return { response: NextResponse.json({ error: "Identifiant d'action manquant." }, { status: 400 }) } as const;
  }

  const supabase = getSupabaseServerClient(true);
  const context = await loadRetrospectiveWriteContext(supabase, actionId, access.userId);
  if (context instanceof Response) return { response: context } as const;
  return { access, supabase, actionId, context } as const;
}

export async function GET(
  _request: Request,
  ctx: RetrospectiveRouteContext,
): Promise<Response> {
  try {
    const resolved = await resolveRequestContext(ctx);
    if ("response" in resolved && resolved.response !== undefined) return resolved.response;
    const retrospective = await loadActionRetrospectiveForActor(
      resolved.supabase,
      resolved.actionId,
      resolved.access.userId,
    );
    return NextResponse.json({ retrospective });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/[actionId]/retrospective");
  }
}

export async function PUT(
  request: Request,
  ctx: RetrospectiveRouteContext,
): Promise<Response> {
  try {
    const resolved = await resolveRequestContext(ctx);
    if ("response" in resolved && resolved.response !== undefined) return resolved.response;
    const parsed = await parseJsonBodyWithValidation(request, actionRetrospectiveDraftSchema);
    if (!parsed.ok) return parsed.response;
    const retrospective = await saveActionRetrospective(
      resolved.supabase,
      resolved.actionId,
      resolved.access.userId,
      parsed.data,
    );
    return NextResponse.json({ retrospective });
  } catch (error) {
    return retrospectiveOperationError(error);
  }
}

export async function POST(
  _request: Request,
  ctx: RetrospectiveRouteContext,
): Promise<Response> {
  try {
    const resolved = await resolveRequestContext(ctx);
    if ("response" in resolved && resolved.response !== undefined) return resolved.response;
    const retrospective = await publishActionRetrospective(
      resolved.supabase,
      resolved.actionId,
      resolved.access.userId,
    );
    return NextResponse.json({ retrospective });
  } catch (error) {
    return retrospectiveOperationError(error);
  }
}

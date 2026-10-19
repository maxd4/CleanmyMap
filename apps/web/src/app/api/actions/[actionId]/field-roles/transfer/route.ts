import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import {
  proposeActionFieldRoleTransfer,
  respondToActionFieldRoleTransfer,
} from "@/lib/actions/field-roles";
import { resolveActionFieldRoleAccess } from "@/lib/actions/field-roles-http";

export const runtime = "nodejs";
// Justification Vercel: primary-transfer proposals and decisions are identity-scoped mutations; no-store prevents shared-cache exposure of private organizer data.
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ actionId: string }> };

const proposeSchema = z.object({ successorUserId: z.string().trim().min(1) });
const respondSchema = z.object({
  proposalId: z.string().uuid(),
  decision: z.enum(["accept", "reject"]),
  reason: z.string().trim().max(500).optional(),
});

export async function POST(request: Request, context: Context) {
  const auth = await requireActionRequestAccess(request);
  if (!auth.ok) return unauthorizedJsonResponse();
  const parsed = proposeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);
  try {
    const { actionId } = await context.params;
    const access = await resolveActionFieldRoleAccess(actionId.trim(), auth.userId);
    if (!access.ok) return NextResponse.json({ error: access.status === 404 ? "Action introuvable." : "Accès refusé." }, { status: access.status });
    const canPropose = access.isGlobalAdmin || access.isCreator || access.isPrimary;
    if (!canPropose) return NextResponse.json({ error: "Le transfert doit être proposé par le primaire, le créateur ou un administrateur." }, { status: 403 });
    if (access.action.action_phase !== "pre_action" || !["pending", "approved"].includes(access.action.status)) {
      return NextResponse.json({ error: "Le transfert n’est disponible que pendant la pré-action." }, { status: 409 });
    }
    const proposal = await proposeActionFieldRoleTransfer(access.supabase, {
      actionId: actionId.trim(),
      successorUserId: parsed.data.successorUserId,
      actorId: auth.userId,
      actorIsGlobalAdmin: access.isGlobalAdmin,
    });
    // Justification Vercel: transfer state is private and must remain uncached.
    return NextResponse.json({ status: "ok", proposal }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleApiError(error, "POST /api/actions/[actionId]/field-roles/transfer");
  }
}

export async function PATCH(request: Request, context: Context) {
  const auth = await requireActionRequestAccess(request);
  if (!auth.ok) return unauthorizedJsonResponse();
  const parsed = respondSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);
  try {
    const { actionId } = await context.params;
    const access = await resolveActionFieldRoleAccess(actionId.trim(), auth.userId);
    if (!access.ok) return NextResponse.json({ error: access.status === 404 ? "Action introuvable." : "Accès refusé." }, { status: access.status });
    const proposal = await respondToActionFieldRoleTransfer(access.supabase, {
      actionId: actionId.trim(),
      proposalId: parsed.data.proposalId,
      actorId: auth.userId,
      decision: parsed.data.decision,
      actorIsGlobalAdmin: access.isGlobalAdmin,
      reason: parsed.data.reason,
    });
    const expectedStatus = parsed.data.decision === "accept" ? "accepted" : "rejected";
    if (proposal.status !== expectedStatus) {
      return NextResponse.json({ error: "Cette proposition n’est plus disponible.", proposal }, { status: 409 });
    }
    // Justification Vercel: transfer state is private and must remain uncached.
    return NextResponse.json({ status: "ok", proposal }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleApiError(error, "PATCH /api/actions/[actionId]/field-roles/transfer");
  }
}

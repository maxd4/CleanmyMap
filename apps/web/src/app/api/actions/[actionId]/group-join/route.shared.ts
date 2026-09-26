import { z } from "zod";
import type { UserIdentity } from "@/lib/authz";
import type { ActionModerationAuditParams } from "@/lib/actions/moderation-audit";
import { runSingleActionQuery } from "@/lib/actions/query";
import type { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeActionId } from "@/lib/actions/action-id";
import { parseJsonBodyWithValidation, validationErrorResponse } from "@/lib/http/api-errors";

export const toggleSchema = z.object({
  groupJoinEnabled: z.boolean(),
});

export const reviewSchema = z.object({
  participantId: z.string().trim().min(1),
  decision: z.enum(["accept", "reject"]),
  reason: z.string().trim().max(500).optional(),
});

export const addParticipantSchema = z.object({
  participantUserId: z.string().trim().min(1),
  reason: z.string().trim().max(500).optional(),
});

export const searchSchema = z.object({
  q: z.string().trim().min(2).max(120),
  limit: z.coerce.number().int().min(1).max(12).default(8),
});

export const reviewOrAddParticipantSchema = z.union([
  reviewSchema,
  addParticipantSchema,
]);

export type GroupJoinRouteContext = {
  params: Promise<{ actionId: string }>;
};

export type GroupJoinModerationParams = {
  userId: string;
  resolveReviewerAccess: ReviewerAccessResolver;
  canOverrideActionParticipants: (identity: UserIdentity | null | undefined) => boolean;
  appendActionModerationAudit: ModerationAuditAppender;
  resolveAdminAuditIdentity: (fallbackUserId?: string) => Promise<{ actorUserId: string } | null>;
};

export function resolveGroupJoinActionId(actionId: string) {
  const normalized = normalizeActionId(actionId);
  return normalized
    ? { ok: true as const, value: normalized }
    : {
        ok: false as const,
        response: validationErrorResponse({
          actionId: ["Identifiant d'action manquant."],
        }),
      };
}

function parseGroupJoinBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
) {
  return parseJsonBodyWithValidation(request, schema);
}

export async function resolveGroupJoinRequestContext<Schema extends z.ZodType>(
  request: Request,
  ctx: GroupJoinRouteContext,
  schema: Schema,
): Promise<
  | { ok: true; parsed: z.infer<Schema>; trimmedActionId: string }
  | { ok: false; response: Response }
> {
  const body = await parseGroupJoinBody(request, schema);
  if (!body.ok) return { ok: false, response: body.response };
  const { actionId } = await ctx.params;
  const actionIdResult = resolveGroupJoinActionId(actionId);
  if (!actionIdResult.ok) return { ok: false, response: actionIdResult.response };
  return { ok: true, parsed: body.data, trimmedActionId: actionIdResult.value };
}

export type GroupJoinAuditErrorStage =
  | "lookup"
  | "update"
  | "participation_update"
  | "post_update";

export type GroupJoinSupabaseClient = ReturnType<typeof getSupabaseServerClient>;

export type GroupJoinAction = {
  id: string;
  created_by_clerk_id: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  action_phase: "pre_action" | "post_action_draft" | "post_action_complete";
  notes: string | null;
};

export function loadGroupJoinAction(
  supabase: GroupJoinSupabaseClient,
  actionId: string,
) {
  return runSingleActionQuery<GroupJoinAction>(supabase, (query) =>
    query
      .select("id, created_by_clerk_id, status, action_phase, notes")
      .eq("id", actionId)
      .maybeSingle(),
  );
}

export type ReviewerAccess =
  | { ok: true; identity: UserIdentity | null }
  | { ok: false; identity?: null };

export type ReviewerAccessResolver = (params: {
  supabase: GroupJoinSupabaseClient;
  actionId: string;
  creatorUserId?: string | null;
  actorUserId: string;
}) => Promise<ReviewerAccess>;

export type AdminAuditIdentityResolver = (
  fallbackUserId?: string,
) => Promise<{ actorUserId: string } | null>;

export type ModerationAuditAppender = (
  params: ActionModerationAuditParams,
) => Promise<void>;

export function resolveCanonicalClerkUserId(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim() ?? "";
  return /^user_[A-Za-z0-9]+$/.test(normalized) ? normalized : null;
}

export function getAdminParticipationOperation(
  data: z.infer<typeof reviewSchema> | z.infer<typeof addParticipantSchema>,
): string {
  if ("participantUserId" in data) {
    return "admin_add_participant";
  }
  return `admin_review_${data.decision}`;
}

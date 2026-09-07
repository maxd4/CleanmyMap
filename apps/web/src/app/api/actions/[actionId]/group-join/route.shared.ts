import { z } from "zod";
import type { UserIdentity } from "@/lib/authz";
import type { ActionModerationAuditParams } from "@/lib/actions/moderation-audit";
import type { getSupabaseServerClient } from "@/lib/supabase/server";

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

export type GroupJoinAuditErrorStage =
  | "lookup"
  | "update"
  | "participation_update"
  | "post_update";

export type GroupJoinSupabaseClient = ReturnType<typeof getSupabaseServerClient>;

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

import { z } from "zod";
import type { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import {
  actionEditsSchema,
  cleanPlaceEditsSchema,
} from "@/lib/admin/moderation/action-moderation-edits";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const MODERATION_CONFIRM_PHRASE = "CONFIRMER MODERATION";

export const actionPayloadSchema = z.object({
  entityType: z.literal("action"),
  id: z.string().trim().min(1),
  status: z.enum(["pending", "approved", "rejected"]),
  moderationVisibility: z.enum(["visible", "hidden"]).optional(),
  confirmPhrase: z.string().trim().max(120).optional(),
  reason: z.string().trim().max(500).optional(),
  edits: actionEditsSchema,
});

export const cleanPlacePayloadSchema = z.object({
  entityType: z.literal("clean_place"),
  id: z.string().trim().min(1),
  status: z.enum(["new", "validated", "cleaned"]),
  sourceTable: z.literal("trash_spotter_spots").optional(),
  confirmPhrase: z.string().trim().max(120).optional(),
  reason: z.string().trim().max(500).optional(),
  edits: cleanPlaceEditsSchema,
});

export const moderationPayloadSchema = z.union([
  actionPayloadSchema,
  cleanPlacePayloadSchema,
]);

export type ActionModerationPayload = z.infer<typeof actionPayloadSchema>;
export type CleanPlaceModerationPayload = z.infer<typeof cleanPlacePayloadSchema>;
export type ModerationPayload = z.infer<typeof moderationPayloadSchema>;
export type ActionEdits = z.infer<typeof actionEditsSchema>;

export type ModerationSupabaseClient = ReturnType<
  typeof getSupabaseServerClient
>;

export type ModerationErrorStage =
  | "lookup"
  | "update"
  | "post_update"
  | "local_sync";

export type ActionModerationOperation =
  | "reject_action"
  | "hide_action"
  | "restore_after_sanction"
  | "correct_impact";

export type AppendModerationAuditOnce = (
  entry: Parameters<typeof appendAdminOperationAudit>[0],
) => Promise<void>;

export function isValidModerationConfirmationPhrase(
  value: string | null | undefined,
): boolean {
  return (value ?? "").trim().toUpperCase() === MODERATION_CONFIRM_PHRASE;
}

export function hasSensitiveImpactEdit(edits: ActionEdits | undefined): boolean {
  if (!edits) {
    return false;
  }

  return [
    "wasteKg",
    "cigaretteButts",
    "volunteersCount",
    "durationMinutes",
    "wasteBreakdown",
  ].some((field) => edits[field as keyof ActionEdits] !== undefined);
}

export function resolveActionModerationOperation(
  payload: ActionModerationPayload,
): ActionModerationOperation | null {
  if (payload.moderationVisibility === "hidden") {
    return "hide_action";
  }
  if (payload.moderationVisibility === "visible") {
    return "restore_after_sanction";
  }
  if (payload.status === "rejected") {
    return "reject_action";
  }
  if (hasSensitiveImpactEdit(payload.edits)) {
    return "correct_impact";
  }
  return null;
}

export function canonicalTargetUserId(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized && normalized !== "unknown" ? normalized : undefined;
}

export type CleanPlaceAuditSnapshot = {
  status: string;
  spotType: string | null;
  labelChanged: boolean;
  coordinatesChanged: boolean;
  notesChanged: boolean;
};

export function toCleanPlaceAuditSnapshot(
  signalement: {
    status?: string | null;
    spot_type?: string | null;
    label?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    notes?: string | null;
  } | null,
  comparison: {
    status?: string | null;
    spot_type?: string | null;
    label?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    notes?: string | null;
  } | null,
): CleanPlaceAuditSnapshot {
  return {
    status: signalement?.status ?? "unknown",
    spotType: signalement?.spot_type ?? null,
    labelChanged: Boolean(
      signalement && comparison && signalement.label !== comparison.label,
    ),
    coordinatesChanged: Boolean(
      signalement &&
        comparison &&
        (signalement.latitude !== comparison.latitude ||
          signalement.longitude !== comparison.longitude),
    ),
    notesChanged: Boolean(
      signalement && comparison && signalement.notes !== comparison.notes,
    ),
  };
}

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import { loadActionById } from "@/lib/actions/store";
import { isPublishedFuturePreAction } from "@/lib/actions/temporal";
import type { ActionRow } from "@/types/database";
import { createChatNotificationsForMessage } from "./chat-notifications";
import { OFFICIAL_ASSOCIATION_ANNOUNCEMENT_TOPIC_ID } from "./announcements";

export type AssociationActionAnnouncementState =
  | "diffused"
  | "already_diffused"
  | "not_eligible"
  | "failed"
  | "partial";

export type AssociationActionAnnouncementResult = {
  actionId: string;
  state: AssociationActionAnnouncementState;
  messageId: string | null;
  notificationCount: number | null;
  retryable: boolean;
};

type ActionAnnouncementAction = Pick<
  ActionRow,
  | "id"
  | "action_date"
  | "event_start_time"
  | "event_end_time"
  | "location_label"
  | "actor_name"
  | "organizer_name"
  | "organizer_type"
  | "status"
  | "review_state"
  | "published_at"
  | "moderation_visibility"
  | "action_phase"
  | "access_mode"
  | "preparation_data"
>;

type ServiceSupabaseClient = SupabaseClient;

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

export function isEligibleForOfficialAssociationAnnouncement(
  action: ActionAnnouncementAction,
  now = new Date(),
): boolean {
  return (
    action.access_mode === "public" &&
    action.review_state === "approved" &&
    isPublishedFuturePreAction(action, now)
  );
}

export function buildOfficialAssociationAnnouncementContent(
  action: ActionAnnouncementAction,
): { content: string; href: string } {
  const preparation = action.preparation_data as Record<string, unknown> | null | undefined;
  const title = cleanText(preparation?.actionTitle, 160) ?? cleanText(action.location_label, 160) ?? "Action associative";
  const description = cleanText(preparation?.shortDescription ?? preparation?.actionDescription, 500);
  const organizer = cleanText(action.organizer_name ?? action.actor_name, 160) ?? "Structure organisatrice";
  const time = [cleanText(action.event_start_time, 32), cleanText(action.event_end_time, 32)]
    .filter((value): value is string => Boolean(value))
    .join("–");
  const href = `/sections/rejoindre-une-action?actionId=${encodeURIComponent(action.id)}`;
  const lines = [
    `📣 ${title}`,
    `Date : ${action.action_date}${time ? ` · ${time}` : ""}`,
    `Lieu : ${cleanText(action.location_label, 180) ?? "non précisé"}`,
    `Organisé par : ${organizer}`,
    ...(description ? [description] : []),
    `Voir l’action : ${href}`,
  ];
  return { content: lines.join("\n"), href };
}

async function findOfficialAnnouncement(
  supabase: ServiceSupabaseClient,
  actionId: string,
): Promise<string | null> {
  const result = await supabase
    .from("app_messages")
    .select("id")
    .eq("official_action_publication_id", actionId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return typeof result.data?.id === "string" ? result.data.id : null;
}

async function recordDiffusionAudit(params: {
  operationId: string;
  actorUserId: string;
  actionId: string;
  operation: string;
  outcome: "success" | "error";
  partialMutation?: boolean;
}): Promise<void> {
  try {
    await appendAdminOperationAudit({
      operationId: params.operationId,
      at: new Date().toISOString(),
      actorUserId: params.actorUserId,
      operationType: "admin_operation",
      outcome: params.outcome,
      targetId: params.actionId,
      details: {
        operation: params.operation,
        partialMutation: params.partialMutation,
        newValue: { state: params.outcome === "success" ? "diffused" : "retryable_failure" },
      },
    });
  } catch (error) {
    console.warn("[association-action-announcement] audit append failed", {
      actionId: params.actionId,
      outcome: params.outcome,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function result(
  actionId: string,
  state: AssociationActionAnnouncementState,
  messageId: string | null = null,
  notificationCount: number | null = null,
): AssociationActionAnnouncementResult {
  return {
    actionId,
    state,
    messageId,
    notificationCount,
    retryable: state === "failed" || state === "partial",
  };
}

/**
 * Publishes the one server-generated community announcement for an approved
 * association action. Review approval and this diffusion deliberately remain
 * separate transactions so a chat outage cannot undo a valid decision.
 */
export async function publishOfficialAssociationActionAnnouncement(params: {
  supabase: ServiceSupabaseClient;
  actionId: string;
  actorUserId: string;
  operationId?: string;
  retry?: boolean;
  now?: Date;
}): Promise<AssociationActionAnnouncementResult> {
  const operationId = params.operationId ?? randomUUID();
  const operation = params.retry
    ? "association_action_announcement_retry"
    : "association_action_announcement_publish";

  let action: ActionRow | null;
  try {
    action = await loadActionById(params.supabase, params.actionId);
  } catch {
    await recordDiffusionAudit({
      operationId: `${operationId}:diffusion`,
      actorUserId: params.actorUserId,
      actionId: params.actionId,
      operation: `${operation}_lookup_failure`,
      outcome: "error",
    });
    return result(params.actionId, "failed");
  }

  if (!action || !isEligibleForOfficialAssociationAnnouncement(action, params.now)) {
    await recordDiffusionAudit({
      operationId: `${operationId}:diffusion`,
      actorUserId: params.actorUserId,
      actionId: params.actionId,
      operation: `${operation}_not_eligible`,
      outcome: "error",
    });
    return result(params.actionId, "not_eligible");
  }

  let messageId: string | null = null;
  try {
    messageId = await findOfficialAnnouncement(params.supabase, action.id);
  } catch {
    await recordDiffusionAudit({
      operationId: `${operationId}:diffusion`,
      actorUserId: params.actorUserId,
      actionId: params.actionId,
      operation: `${operation}_lookup_failure`,
      outcome: "error",
    });
    return result(params.actionId, "failed");
  }

  let wasAlreadyPresent = Boolean(messageId);
  if (!messageId) {
    const announcement = buildOfficialAssociationAnnouncementContent(action);
    const insertResult = await params.supabase
      .from("app_messages")
      .insert({
        sender_id: params.actorUserId,
        recipient_id: null,
        channel_type: "community",
        conversation_id: null,
        topic_id: OFFICIAL_ASSOCIATION_ANNOUNCEMENT_TOPIC_ID,
        message_kind: "announcement",
        related_event_id: null,
        arrondissement_id: null,
        zone_name: null,
        content: announcement.content,
        attachment_url: null,
        attachment_path: null,
        attachment_type: null,
        attachment_expires_at: null,
        action_id: action.id,
        official_action_publication_id: action.id,
      })
      .select("id")
      .single();

    if (!insertResult.error && typeof insertResult.data?.id === "string") {
      messageId = insertResult.data.id;
      wasAlreadyPresent = false;
    } else {
      // A unique-index race or a response lost after commit is reconciled by
      // reading the durable action key before declaring the publication failed.
      try {
        messageId = await findOfficialAnnouncement(params.supabase, action.id);
      } catch {
        messageId = null;
      }
      if (!messageId) {
        await recordDiffusionAudit({
          operationId: `${operationId}:diffusion`,
          actorUserId: params.actorUserId,
          actionId: params.actionId,
          operation: `${operation}_insert_failure`,
          outcome: "error",
        });
        return result(params.actionId, "failed");
      }
      wasAlreadyPresent = true;
    }
  }

  try {
    const notificationCount = await createChatNotificationsForMessage(
      params.supabase,
      messageId,
      params.actorUserId,
    );
    await recordDiffusionAudit({
      operationId: `${operationId}:diffusion`,
      actorUserId: params.actorUserId,
      actionId: params.actionId,
      operation,
      outcome: "success",
    });
    return result(
      params.actionId,
      wasAlreadyPresent ? "already_diffused" : "diffused",
      messageId,
      notificationCount,
    );
  } catch {
    await recordDiffusionAudit({
      operationId: `${operationId}:diffusion`,
      actorUserId: params.actorUserId,
      actionId: params.actionId,
      operation: `${operation}_notification_failure`,
      outcome: "error",
      partialMutation: true,
    });
    return result(params.actionId, "partial", messageId);
  }
}

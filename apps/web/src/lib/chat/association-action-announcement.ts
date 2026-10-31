import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import { loadActionById } from "@/lib/actions/store";
import { isPublishedFuturePreAction } from "@/lib/actions/temporal";
import type { ActionRow } from "@/types/database";
import { createChatNotificationsForMessage } from "./chat-notifications";
import { OFFICIAL_ASSOCIATION_ANNOUNCEMENT_TOPIC_ID } from "./announcements";

type AssociationActionAnnouncementState =
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

type OfficialAnnouncementMessage = {
  id: string;
  senderId: string;
};

type OfficialAnnouncementParams = {
  supabase: ServiceSupabaseClient;
  actionId: string;
  actorUserId: string;
  operationId?: string;
  retry?: boolean;
  now?: Date;
};

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
): Promise<OfficialAnnouncementMessage | null> {
  const result = await supabase
    .from("app_messages")
    .select("id, sender_id")
    .eq("official_action_publication_id", actionId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return typeof result.data?.id === "string" && typeof result.data.sender_id === "string"
    ? { id: result.data.id, senderId: result.data.sender_id }
    : null;
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

async function ensureOfficialAnnouncementMessage(
  params: OfficialAnnouncementParams,
  action: ActionAnnouncementAction,
  operationId: string,
  operation: string,
): Promise<{ message: OfficialAnnouncementMessage; wasAlreadyPresent: boolean } | null> {
  let message: OfficialAnnouncementMessage | null;
  try {
    message = await findOfficialAnnouncement(params.supabase, action.id);
  } catch {
    await recordDiffusionAudit({
      operationId: `${operationId}:diffusion`,
      actorUserId: params.actorUserId,
      actionId: params.actionId,
      operation: `${operation}_lookup_failure`,
      outcome: "error",
    });
    return null;
  }
  if (message) return { message, wasAlreadyPresent: true };
  const inserted = await insertOfficialAnnouncementMessage(params, action, operationId, operation);
  return inserted;
}

async function insertOfficialAnnouncementMessage(
  params: OfficialAnnouncementParams,
  action: ActionAnnouncementAction,
  operationId: string,
  operation: string,
): Promise<{ message: OfficialAnnouncementMessage; wasAlreadyPresent: boolean } | null> {
  const announcement = buildOfficialAssociationAnnouncementContent(action);
  let message: OfficialAnnouncementMessage | null = null;
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
    .select("id, sender_id")
    .single();
  if (!insertResult.error && typeof insertResult.data?.id === "string" && typeof insertResult.data.sender_id === "string") {
    return { message: { id: insertResult.data.id, senderId: insertResult.data.sender_id }, wasAlreadyPresent: false };
  }
  try {
    message = await findOfficialAnnouncement(params.supabase, action.id);
  } catch {
    message = null;
  }
  if (message) return { message, wasAlreadyPresent: true };
  await recordDiffusionAudit({
    operationId: `${operationId}:diffusion`,
    actorUserId: params.actorUserId,
    actionId: params.actionId,
    operation: `${operation}_insert_failure`,
    outcome: "error",
  });
  return null;
}

async function loadAnnouncementAction(
  params: OfficialAnnouncementParams,
  operationId: string,
  operation: string,
): Promise<{ action: ActionAnnouncementAction | null; failed: boolean }> {
  try {
    return { action: await loadActionById(params.supabase, params.actionId), failed: false };
  } catch {
    await recordDiffusionAudit({
      operationId: `${operationId}:diffusion`,
      actorUserId: params.actorUserId,
      actionId: params.actionId,
      operation: `${operation}_lookup_failure`,
      outcome: "error",
    });
    return { action: null, failed: true };
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
export async function publishOfficialAssociationActionAnnouncement(params: OfficialAnnouncementParams): Promise<AssociationActionAnnouncementResult> {
  const operationId = params.operationId ?? randomUUID();
  const operation = params.retry
    ? "association_action_announcement_retry"
    : "association_action_announcement_publish";

  const loadedAction = await loadAnnouncementAction(params, operationId, operation);
  if (loadedAction.failed) return result(params.actionId, "failed");
  const action = loadedAction.action;

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

  const ensuredMessage = await ensureOfficialAnnouncementMessage(params, action, operationId, operation);
  if (!ensuredMessage) return result(params.actionId, "failed");
  const { message: announcementMessage, wasAlreadyPresent } = ensuredMessage;

  try {
    const notificationCount = await createChatNotificationsForMessage(
      params.supabase,
      announcementMessage.id,
      announcementMessage.senderId,
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
      announcementMessage.id,
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
    return result(params.actionId, "partial", announcementMessage?.id ?? null);
  }
}

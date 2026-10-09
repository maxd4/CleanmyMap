import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionUpdateInput } from "./action-update-audit";
import { hasActionImpactUpdate } from "./action-update-impact";
import { logFailure } from "@/lib/logging/failure-log";
import {
  loadActionParticipantImpactSnapshot,
  type ActionParticipantImpactSnapshot,
} from "./participation/group-participation-read";
import type { ActionParticipantImpactAttribution } from "./participation/individual-impact";

type ActionParticipantImpactNotificationParams = {
  supabase: SupabaseClient;
  actionId: string;
  previousSnapshot: ActionParticipantImpactSnapshot | null;
  persistedRevision?: string | null;
};

export async function captureActionParticipantImpactSnapshot(
  supabase: SupabaseClient,
  actionId: string,
): Promise<ActionParticipantImpactSnapshot | null> {
  try {
    return await loadActionParticipantImpactSnapshot(supabase, actionId);
  } catch (error) {
    logFailure(
      "action-participant-impact-notifications",
      "Unable to capture the pre-change participant impact snapshot",
      error,
      { actionId },
    );
    return null;
  }
}

export async function captureActionUpdateParticipantImpactSnapshot(params: {
  supabase: SupabaseClient;
  actionId: string;
  current: {
    status: string;
    action_phase: string;
    published_at?: string | null;
    moderation_visibility?: string | null;
  };
  body: ActionUpdateInput;
}): Promise<ActionParticipantImpactSnapshot | null> {
  const shouldTrack =
    params.body.participantAccounts !== undefined ||
    params.body.organizerAccounts !== undefined ||
    hasActionImpactUpdate(params.body);
  const isPublicFinal =
    params.current.status === "approved" &&
    params.current.action_phase === "post_action_complete" &&
    Boolean(params.current.published_at) &&
    params.current.moderation_visibility !== "hidden";
  return shouldTrack && isPublicFinal
    ? captureActionParticipantImpactSnapshot(params.supabase, params.actionId)
    : null;
}

function attributionFingerprint(
  attribution: ActionParticipantImpactAttribution,
): string {
  return createHash("sha256")
    .update(JSON.stringify(attribution))
    .digest("hex")
    .slice(0, 32);
}

function impactRevisionFingerprint(revision: string): string {
  return createHash("sha256").update(revision, "utf8").digest("hex");
}

function impactEventKey(params: {
  actionId: string;
  userId: string;
  revisionFingerprint: string;
  attributionFingerprint: string;
}): string {
  const identity = [
    params.actionId,
    params.userId,
    params.revisionFingerprint,
    params.attributionFingerprint,
  ].join(":");
  return `action_result_impact:${createHash("sha256").update(identity, "utf8").digest("hex")}`;
}

function attributionChanged(
  previous: ActionParticipantImpactAttribution | undefined,
  current: ActionParticipantImpactAttribution,
): boolean {
  return JSON.stringify(previous ?? null) !== JSON.stringify(current);
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "23505",
  );
}

function actionImpactNotificationPayload(params: {
  actionId: string;
  userId: string;
  revisionFingerprint: string;
  fingerprint: string;
}) {
  return {
    eventType: "action_event",
    subtype: "action_result_impact",
    requestKind: "action_result_impact",
    actionId: params.actionId,
    revision: params.revisionFingerprint,
    attributionFingerprint: params.fingerprint,
    eventKey: impactEventKey({
      actionId: params.actionId,
      userId: params.userId,
      revisionFingerprint: params.revisionFingerprint,
      attributionFingerprint: params.fingerprint,
    }),
    href: `/sections/rejoindre-une-action?tab=past&actionId=${encodeURIComponent(params.actionId)}`,
  };
}

async function insertImpactNotifications(params: {
  supabase: SupabaseClient;
  actionId: string;
  snapshot: ActionParticipantImpactSnapshot;
  userIds: string[];
  revision?: string | null;
}): Promise<boolean> {
  let inserted = false;
  const rawRevision = params.revision ?? params.snapshot.revision;
  if (!rawRevision) return false;
  const revisionFingerprint = impactRevisionFingerprint(rawRevision);
  for (const userId of params.userIds) {
    const attribution = params.snapshot.attributions.get(userId);
    if (!attribution) continue;
    const fingerprint = attributionFingerprint(attribution);

    const result = await params.supabase.from("app_notifications").insert({
      user_id: userId,
      type: "action_event",
      title: "Attribution personnelle mise à jour",
      content: "La projection actuelle de votre impact pour cette action a changé. Consultez le détail de l'action pour voir les données à jour.",
      payload: actionImpactNotificationPayload({
        actionId: params.actionId,
        userId,
        revisionFingerprint,
        fingerprint,
      }),
    });
    if (result.error && !isUniqueViolation(result.error)) {
      throw new Error(result.error.message);
    }
    inserted ||= !result.error;
  }
  return inserted;
}

/**
 * Emits only effective changes to an already-confirmed participant's current
 * projection. The projection and allocation stay owned by the action domain;
 * this helper only compares snapshots and records a deduplicated action_event.
 */
export async function emitActionParticipantImpactNotifications(
  params: ActionParticipantImpactNotificationParams,
): Promise<boolean> {
  if (
    !params.previousSnapshot?.available ||
    params.previousSnapshot.readStatus !== "available"
  ) return false;

  try {
    const currentSnapshot = await loadActionParticipantImpactSnapshot(
      params.supabase,
      params.actionId,
    );
    if (!currentSnapshot.available || currentSnapshot.readStatus !== "available") return false;

    const changedUserIds = [...currentSnapshot.attributions.entries()]
      .filter(([userId, attribution]) =>
        params.previousSnapshot?.attributions.has(userId) &&
        attributionChanged(params.previousSnapshot.attributions.get(userId), attribution),
      )
      .map(([userId]) => userId);
    if (changedUserIds.length === 0) return false;

    return insertImpactNotifications({
      supabase: params.supabase,
      actionId: params.actionId,
      snapshot: currentSnapshot,
      userIds: changedUserIds,
      revision: params.persistedRevision,
    });
  } catch (error) {
    logFailure(
      "action-participant-impact-notifications",
      "Action participant impact notification delivery failed",
      error,
      { actionId: params.actionId },
    );
    return false;
  }
}

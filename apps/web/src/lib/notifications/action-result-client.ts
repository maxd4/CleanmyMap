"use client";

import type {
  ActionRegistrationRequestDecisionResponse,
  NotificationDecision,
} from "./client";
import { readContactRequestsResponse } from "./client";

export type ActionResultPromptDecision = "claim" | "not_participated";

export type ActionResultPromptDecisionResponse = {
  status: "claimed" | "declined" | "unavailable";
  actionId: string | null;
};

function parseActionResultPromptIds(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const prompts = (payload as { prompts?: unknown }).prompts;
  if (!Array.isArray(prompts)) return [];
  return prompts.flatMap((prompt) => {
    if (!prompt || typeof prompt !== "object") return [];
    const id = (prompt as { action_id?: unknown }).action_id;
    return typeof id === "string" && id.trim() ? [id.trim()] : [];
  });
}
export async function loadPendingActionResultPromptIds(): Promise<string[]> {
  const response = await fetch("/api/actions/post-action-prompts", {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  return parseActionResultPromptIds(await readContactRequestsResponse(response));
}

function parsePostActionClaimIds(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const claims = (payload as { claims?: unknown }).claims;
  if (!Array.isArray(claims)) return [];
  return claims.flatMap((claim) => {
    if (!claim || typeof claim !== "object") return [];
    const id = (claim as { participation_id?: unknown }).participation_id;
    return typeof id === "string" && id.trim() ? [id.trim()] : [];
  });
}

export async function loadPendingPostActionClaimIds(): Promise<string[]> {
  const response = await fetch("/api/actions/post-action-claims", {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  return parsePostActionClaimIds(await readContactRequestsResponse(response));
}

export async function respondToActionResultPrompt(
  actionId: string,
  decision: ActionResultPromptDecision,
): Promise<ActionResultPromptDecisionResponse> {
  const response = await fetch("/api/actions/post-action-prompts", {
    method: "PATCH",
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ actionId, decision }),
  });
  const payload = await readContactRequestsResponse(response);
  if (!payload || typeof payload !== "object") {
    throw new Error("La sollicitation de résultats n'a pas renvoyé d'état valide.");
  }
  const raw = payload as Record<string, unknown>;
  const status = raw.status;
  if (status !== "claimed" && status !== "declined" && status !== "unavailable") {
    throw new Error("La sollicitation de résultats n'a pas renvoyé d'état valide.");
  }
  return {
    status,
    actionId: typeof raw.actionId === "string" ? raw.actionId : actionId,
  };
}
export async function respondToPostActionClaimReview(
  actionId: string,
  participationId: string,
  decision: Extract<NotificationDecision, "accept" | "reject">,
): Promise<ActionRegistrationRequestDecisionResponse> {
  const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/group-join`, {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      participantId: participationId,
      decision,
      requestKind: "post_action_claim",
    }),
  });
  const payload = await readContactRequestsResponse(response);
  if (!payload || typeof payload !== "object") {
    throw new Error("La review de participation n'a pas renvoyé d'état valide.");
  }
  const raw = payload as Record<string, unknown>;
  if (raw.status !== "ok") {
    throw new Error("La review de participation n'a pas renvoyé d'état valide.");
  }
  const participationStatus = raw.participationStatus;
  const alreadyReviewed = raw.alreadyReviewed === true;
  return {
    status: alreadyReviewed || participationStatus !== "confirmed" && participationStatus !== "cancelled"
      ? "unavailable"
      : decision === "accept" ? "accepted" : "rejected",
    registrationId: typeof raw.participantId === "string" ? raw.participantId : participationId,
    actionId: typeof raw.actionId === "string" ? raw.actionId : actionId,
  };
}

// Result prompts and claim reviews remain same-origin, no-store requests;
// authorization is enforced again by their server routes.

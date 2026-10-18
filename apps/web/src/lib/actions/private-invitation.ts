import { createHash, randomBytes } from "node:crypto";
import { isActionStartInFuture } from "@/lib/actions/temporal";
import type { ActionPhase, ActionStatus } from "@/lib/actions/types";
import type { ActionAccessMode } from "@/lib/actions/types";

export const INVITATION_TOKEN_BYTES = 32;
export const INVITATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export type PrivateInvitationActionState =
  | "pre_action"
  | "awaiting_finalization"
  | "post_action_claim"
  | "closed";

export type PrivateInvitationAction = {
  access_mode?: ActionAccessMode | null;
  action_phase?: ActionPhase | null;
  status?: ActionStatus | null;
  moderation_visibility?: "visible" | "hidden" | null;
  published_at?: string | null;
  action_date: string;
  event_start_time?: string | null;
};

export function createInvitationToken(): string {
  return randomBytes(INVITATION_TOKEN_BYTES).toString("base64url");
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isInvitationTokenFormat(token: string): boolean {
  return INVITATION_TOKEN_PATTERN.test(token);
}

export function isInvitationExpired(expiresAt: string, now = new Date()): boolean {
  const expiration = Date.parse(expiresAt);
  return !Number.isFinite(expiration) || expiration <= now.getTime();
}

export function resolvePrivateInvitationActionState(
  action: PrivateInvitationAction,
  now = new Date(),
): PrivateInvitationActionState {
  if (action.access_mode !== "invite_link") return "closed";

  if (
    action.action_phase === "pre_action" &&
    (action.status === "pending" || action.status === "approved")
  ) {
    return isActionStartInFuture(action, now)
      ? "pre_action"
      : "awaiting_finalization";
  }

  if (
    action.action_phase === "post_action_complete" &&
    action.status === "approved" &&
    action.moderation_visibility !== "hidden" &&
    Boolean(action.published_at) &&
    !isActionStartInFuture(action, now)
  ) {
    return "post_action_claim";
  }

  return "closed";
}

export function buildInvitationUrl(request: Request, token: string): string {
  return new URL(`/actions/invite/${token}`, request.url).toString();
}

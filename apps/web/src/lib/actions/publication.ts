import type { ActionPhase } from "./types";

export type ActionPublicationState = {
  actionPhase: ActionPhase;
  publishedAt: string | null | undefined;
};

export function canPublishPreAction(action: ActionPublicationState): boolean {
  return action.actionPhase === "pre_action" && !action.publishedAt;
}

export function isExplicitlyPublished(
  action: Pick<ActionPublicationState, "publishedAt">,
): boolean {
  return Boolean(action.publishedAt);
}

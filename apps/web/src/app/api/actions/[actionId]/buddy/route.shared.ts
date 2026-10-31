import { normalizeActionId } from "@/lib/actions/action-id";
import { validationErrorResponse } from "@/lib/http/api-errors";

export type BuddyActionContext = {
  params: Promise<{ actionId: string }>;
};

export type BuddyResourceContext = {
  params: Promise<{ actionId: string; proposalId?: string; requestId?: string }>;
};

export type BuddyValidationResponse = ReturnType<typeof validationErrorResponse>;

export const BUDDY_PRIVATE_HEADERS = { "Cache-Control": "private, no-store" } as const;

export async function resolveBuddyActionId(
  context: BuddyActionContext,
): Promise<string | BuddyValidationResponse> {
  const actionId = normalizeActionId((await context.params).actionId);
  return actionId ?? validationErrorResponse({ actionId: ["Identifiant d'action manquant."] });
}

export async function resolveBuddyResourceParams(
  context: BuddyResourceContext,
  resourceKey: "proposalId" | "requestId",
): Promise<{ actionId: string; resourceId: string } | BuddyValidationResponse> {
  const params = await context.params;
  const actionId = normalizeActionId(params.actionId);
  const resourceId = params[resourceKey]?.trim() ?? "";
  if (!actionId || !resourceId) {
    return validationErrorResponse({ [resourceKey]: [`Identifiant de ${resourceKey === "proposalId" ? "proposition" : "demande"} manquant.`] });
  }
  return { actionId, resourceId };
}

import type { SupabaseClient } from "@supabase/supabase-js";

export type ActionShareRequestResult =
  | "created"
  | "already_pending"
  | "cooldown"
  | "already_shared";

export type ActionShareRequestCreation = {
  requestId: string | null;
  result: ActionShareRequestResult;
  retryAfterSeconds: number | null;
};

export type ActionShareRequestDecision = "accept" | "reject" | "ignore";
export type ActionShareRequestStatus = "accepted" | "rejected" | "ignored" | "unavailable";

export type ActionShareRequestResponse = {
  status: ActionShareRequestStatus;
  messageId: string | null;
  actionId: string | null;
  senderId: string | null;
};

function firstRow<T>(data: T | T[] | null): T | null {
  return Array.isArray(data) ? data[0] ?? null : data;
}

export async function createActionShareRequest(
  supabase: SupabaseClient,
  params: {
    senderId: string;
    recipientId: string;
    actionId: string;
    content: string;
  },
): Promise<ActionShareRequestCreation> {
  const { data, error } = await supabase.rpc("create_action_share_request", {
    p_sender_id: params.senderId,
    p_recipient_id: params.recipientId,
    p_action_id: params.actionId,
    p_content: params.content,
  });
  if (error) throw error;

  const row = firstRow(data as (ActionShareRequestCreation & {
    request_id?: string | null;
    retry_after_seconds?: number | null;
  }) | (ActionShareRequestCreation & {
    request_id?: string | null;
    retry_after_seconds?: number | null;
  })[] | null);
  if (
    !row ||
    typeof row.result !== "string" ||
    !["created", "already_pending", "cooldown", "already_shared"].includes(row.result)
  ) {
    throw new Error("La demande de partage n'a pas renvoyé un état valide.");
  }

  return {
    requestId:
      typeof row.requestId === "string"
        ? row.requestId
        : typeof row.request_id === "string"
          ? row.request_id
          : null,
    result: row.result as ActionShareRequestResult,
    retryAfterSeconds:
      typeof row.retryAfterSeconds === "number"
        ? row.retryAfterSeconds
        : typeof row.retry_after_seconds === "number"
          ? row.retry_after_seconds
          : null,
  };
}

export async function respondToActionShareRequest(
  supabase: SupabaseClient,
  params: {
    requestId: string;
    recipientId: string;
    decision: ActionShareRequestDecision;
  },
): Promise<ActionShareRequestResponse> {
  const { data, error } = await supabase.rpc("respond_action_share_request", {
    p_request_id: params.requestId,
    p_recipient_id: params.recipientId,
    p_decision: params.decision,
  });
  if (error) throw error;

  const row = firstRow(data as (ActionShareRequestResponse & {
    message_id?: string | null;
    action_id?: string | null;
    sender_id?: string | null;
  }) | (ActionShareRequestResponse & {
    message_id?: string | null;
    action_id?: string | null;
    sender_id?: string | null;
  })[] | null);
  if (!row || typeof row.status !== "string") {
    throw new Error("La réponse à la demande de partage n'a pas renvoyé un état valide.");
  }

  return {
    status: row.status as ActionShareRequestResponse["status"],
    messageId:
      typeof row.messageId === "string"
        ? row.messageId
        : typeof row.message_id === "string"
          ? row.message_id
          : null,
    actionId:
      typeof row.actionId === "string"
        ? row.actionId
        : typeof row.action_id === "string"
          ? row.action_id
          : null,
    senderId:
      typeof row.senderId === "string"
        ? row.senderId
        : typeof row.sender_id === "string"
          ? row.sender_id
          : null,
  };
}

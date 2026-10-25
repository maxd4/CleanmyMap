import type { SupabaseClient } from "@supabase/supabase-js";
import { parseChatSingleRow, parseChatSupabaseResult } from "./postgrest";
import {
  isChatActionShareRequestCreationRuntimeRow,
  isChatActionShareRequestDecisionRuntimeRow,
} from "./runtime-contracts";

type ActionShareRequestResult =
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
type ActionShareRequestStatus = "accepted" | "rejected" | "ignored" | "unavailable";

export type ActionShareRequestResponse = {
  status: ActionShareRequestStatus;
  messageId: string | null;
  actionId: string | null;
  senderId: string | null;
};

function isActionShareRequestResult(value: string): value is ActionShareRequestResult {
  return ["created", "already_pending", "cooldown", "already_shared"].includes(value);
}

function isActionShareRequestStatus(value: string): value is ActionShareRequestResponse["status"] {
  return ["accepted", "rejected", "ignored", "unavailable"].includes(value);
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
  const rawResult: unknown = await supabase.rpc("create_action_share_request", {
    p_sender_id: params.senderId,
    p_recipient_id: params.recipientId,
    p_action_id: params.actionId,
    p_content: params.content,
  });
  const result = parseChatSupabaseResult(rawResult);
  if (result.error) throw result.error;

  const row = parseChatSingleRow(result.data, isChatActionShareRequestCreationRuntimeRow);
  if (!row || !isActionShareRequestResult(row.result)) {
    throw new Error("La demande de partage n'a pas renvoyé un état valide.");
  }

  return {
    requestId: row.request_id,
    result: row.result,
    retryAfterSeconds: row.retry_after_seconds,
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
  const rawResult: unknown = await supabase.rpc("respond_action_share_request", {
    p_request_id: params.requestId,
    p_recipient_id: params.recipientId,
    p_decision: params.decision,
  });
  const result = parseChatSupabaseResult(rawResult);
  if (result.error) throw result.error;

  const row = parseChatSingleRow(result.data, isChatActionShareRequestDecisionRuntimeRow);
  if (!row || !isActionShareRequestStatus(row.status)) {
    throw new Error("La réponse à la demande de partage n'a pas renvoyé un état valide.");
  }

  return {
    status: row.status,
    messageId: row.message_id,
    actionId: row.action_id,
    senderId: row.sender_id,
  };
}

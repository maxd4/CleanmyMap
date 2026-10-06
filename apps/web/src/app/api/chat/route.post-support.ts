import { NextResponse } from "next/server";
import { getCommunityBugReportById } from "@/lib/community/bug-reports-store";
import { isPublicActionReferenceAvailable } from "@/lib/chat/action-sharing";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import { type FeedbackReplyContext } from "./route.post-persistence";
import type { ValidatedChatPost } from "./route.post-validation";
import type { SharedAction } from "./route.post-context";

export function mapActionDiscussionAccessError(
  state: "excluded" | "forbidden" | "unavailable" | "allowed",
): Response | null {
  if (state === "excluded") {
    return NextResponse.json({ error: "Vous êtes exclu de cette discussion." }, { status: 403 });
  }
  if (state === "forbidden") {
    return NextResponse.json({ error: "Vous n'êtes pas autorisé à participer à cette discussion." }, { status: 403 });
  }
  if (state === "unavailable") {
    return NextResponse.json({ error: "Discussion d'action introuvable." }, { status: 404 });
  }
  return null;
}

type ServiceSupabaseClient = ReturnType<typeof getSupabaseServerClient>;
type ChatSupabaseClient = NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>;

export async function getChatSupabaseOrResponse(): Promise<ChatSupabaseClient | Response> {
  const supabase = await getSupabaseClerkRlsClient();
  if (supabase) return supabase;
  return NextResponse.json(
    {
      error: "Connexion sécurisée indisponible",
      hint: "Activez l'intégration native Clerk/Supabase dans Supabase et vérifiez que la session Clerk est disponible.",
    },
    { status: 503 },
  );
}

export async function resolveFeedbackReplyContext(
  data: ValidatedChatPost["data"],
): Promise<FeedbackReplyContext | Response> {
  if (
    data.channelType !== "dm" ||
    data.messageKind !== "message" ||
    data.actionId ||
    data.relatedEventId ||
    data.topicId ||
    data.attachmentUrl ||
    data.attachmentType ||
    !data.operationId
  ) {
    return NextResponse.json({ error: "Contexte feedback invalide" }, { status: 400 });
  }
  const feedback = await getCommunityBugReportById(data.feedbackId!);
  const targetUserId = feedback?.submittedByUserId?.trim();
  const recipientId = data.recipientId?.trim();
  if (
    !feedback ||
    !targetUserId ||
    targetUserId === "unknown" ||
    !recipientId ||
    recipientId !== targetUserId
  ) {
    return NextResponse.json({ error: "Destinataire feedback invalide" }, { status: 403 });
  }
  return { feedbackId: data.feedbackId!, targetUserId };
}

export async function resolvePublicSharedAction(
  serviceSupabase: ServiceSupabaseClient,
  data: ValidatedChatPost["data"],
  enabled: boolean,
): Promise<SharedAction | Response | null> {
  if (!enabled) return null;
  const actionId = data.actionId;
  if (!actionId) {
    return NextResponse.json(
      { error: "Action non partageable", hint: "Cette action n'est plus publiée ou accessible." },
      { status: 403 },
    );
  }
  const { loadActionById } = await import("@/lib/actions/store");
  const action = await loadActionById(serviceSupabase, actionId);
  if (!action || !isPublicActionReferenceAvailable(action)) {
    return NextResponse.json(
      { error: "Action non partageable", hint: "Cette action n'est plus publiée ou accessible." },
      { status: 403 },
    );
  }
  return action;
}

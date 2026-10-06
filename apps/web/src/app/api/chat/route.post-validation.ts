import { NextResponse } from "next/server";
import { z } from "zod";
import { validationErrorResponse } from "@/lib/http/api-errors";
import { isSupportedChatAttachmentMimeType } from "@/lib/chat/chat-attachments";
import {
  sendMessageSchemaForUser,
  validateMessageKind,
  validateTopicForChannel,
} from "./route.shared";

type SendChatMessageData = z.infer<ReturnType<typeof sendMessageSchemaForUser>>;
type ValidatedTopicId = ReturnType<typeof validateTopicForChannel>["topicId"];

export type ValidatedChatPost = {
  data: SendChatMessageData;
  topicId: string | null;
  messageKind: SendChatMessageData["messageKind"];
  isExternalActionShare: boolean;
};

type ChatPostValidationResult =
  | { ok: true; value: ValidatedChatPost }
  | { ok: false; response: Response };

function validateActionContract(data: SendChatMessageData): Response | null {
  if (data.channelType === "action" && !data.actionId) {
    return NextResponse.json(
      { error: "Action requise", hint: "Sélectionnez une action publiée." },
      { status: 400 },
    );
  }
  const isExternalActionShare =
    data.channelType !== "action" && Boolean(data.actionId);
  if (
    isExternalActionShare &&
    !["community", "territory", "dm"].includes(data.channelType)
  ) {
    return NextResponse.json(
      {
        error: "Partage indisponible",
        hint: "Une action peut être partagée uniquement dans une conversation publique, territoriale ou privée existante.",
      },
      { status: 403 },
    );
  }
  const hasForbiddenShareContext =
    data.messageKind !== "message" ||
    Boolean(data.topicId || data.relatedEventId || data.attachmentUrl || data.attachmentType) ||
    Boolean(data.pollOptions !== undefined) ||
    Boolean(data.recipientId && data.channelType !== "dm") ||
    Boolean(data.channelType === "community" && (data.zoneName || data.arrondissementId));
  if (isExternalActionShare && hasForbiddenShareContext) {
    return NextResponse.json(
      {
        error: "Partage invalide",
        hint: "Le partage d'action est un message standard contenant uniquement la référence actionId.",
      },
      { status: 400 },
    );
  }
  return null;
}

function validateMessageContract(
  data: SendChatMessageData,
  topicId: ValidatedTopicId,
): Response | null {
  const messageKindValidation = validateMessageKind(
    data.channelType,
    data.messageKind,
    topicId,
    data.relatedEventId,
    data.attachmentUrl,
    data.pollOptions,
  );
  return messageKindValidation.error
    ? NextResponse.json(
        { error: "Type de message invalide", hint: messageKindValidation.error },
        { status: 400 },
      )
    : null;
}

function validateAttachmentContract(data: SendChatMessageData): Response | null {
  if (!data.attachmentUrl) return null;
  if (!data.attachmentType) {
    return validationErrorResponse({
      attachmentType: [
        "Le type de la pièce jointe est requis quand un fichier est envoyé.",
      ],
    });
  }
  return isSupportedChatAttachmentMimeType(data.attachmentType)
    ? null
    : validationErrorResponse({
        attachmentType: [
          "Ce format de pièce jointe n'est pas autorisé. Utilisez une image, un PDF ou un document courant.",
        ],
      });
}

export async function validateChatPostRequest(
  request: Request,
  userId: string,
): Promise<ChatPostValidationResult> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }),
    };
  }

  const parsed = sendMessageSchemaForUser(userId).safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      response: validationErrorResponse(parsed.error.flatten().fieldErrors),
    };
  }

  const topicValidation = validateTopicForChannel(
    parsed.data.channelType,
    parsed.data.topicId,
  );
  if (topicValidation.error) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Salon invalide", hint: topicValidation.error },
        { status: 400 },
      ),
    };
  }

  const messageKind = parsed.data.messageKind;
  const isExternalActionShare =
    parsed.data.channelType !== "action" && Boolean(parsed.data.actionId);
  for (const response of [
    validateActionContract(parsed.data),
    validateMessageContract(parsed.data, topicValidation.topicId),
    validateAttachmentContract(parsed.data),
  ]) {
    if (response) return { ok: false, response };
  }

  return {
    ok: true,
    value: {
      data: parsed.data,
      topicId: topicValidation.topicId,
      messageKind,
      isExternalActionShare,
    },
  };
}

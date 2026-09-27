import { z } from "zod";
import {
  CHAT_MESSAGE_KINDS,
  type ChatMessageKind,
} from "@/lib/chat/announcements";
import {
  CHAT_ATTACHMENT_MAX_SIZE_BYTES,
  CHAT_VIDEO_UNSUPPORTED_MESSAGE,
  isSafeChatAttachmentUrl,
  isSupportedChatAttachmentMimeType,
  isUnsupportedChatVideoMimeType,
  isChatAttachmentPathOwnedByUser,
} from "@/lib/chat/chat-attachments";
import type { ChatChannelType } from "@/lib/chat/channels";

export const CHANNEL_TYPES = [
  "community",
  "dm",
  "admin_elu",
  "territory",
  "bug_report",
  "action",
] as const satisfies readonly ChatChannelType[];

type SendMessageData = {
  messageKind: ChatMessageKind;
  content: string;
  attachmentUrl?: string;
  attachmentPath?: string;
  attachmentType?: string;
  attachmentSize?: number;
};

function addIssue(
  context: z.RefinementCtx,
  path: string[],
  message: string,
): void {
  context.addIssue({ code: z.ZodIssueCode.custom, path, message });
}

function validateAttachmentContract(data: SendMessageData, context: z.RefinementCtx): void {
  if (data.messageKind !== "message") return;

  const hasAttachment = Boolean(data.attachmentUrl || data.attachmentPath);
  const hasType = Boolean(data.attachmentType);
  const hasSize = data.attachmentSize !== undefined;

  if (hasAttachment && !hasType) {
    addIssue(context, ["attachmentType"], "Le type de la pièce jointe est requis quand un fichier est envoyé.");
  }
  if (!hasAttachment && hasType) {
    addIssue(context, ["attachmentUrl"], "La référence de la pièce jointe est requise quand un type de fichier est envoyé.");
  }
  if (hasAttachment && hasType && !hasSize) {
    addIssue(context, ["attachmentSize"], "La taille de la pièce jointe est requise.");
  }
  if (hasSize && data.attachmentSize! > CHAT_ATTACHMENT_MAX_SIZE_BYTES) {
    addIssue(context, ["attachmentSize"], "La pièce jointe dépasse la limite de 8 Mio (8 MiB).");
  }
  if (data.attachmentType && !isSupportedChatAttachmentMimeType(data.attachmentType)) {
    if (!isUnsupportedChatVideoMimeType(data.attachmentType)) {
      addIssue(
        context,
        ["attachmentType"],
        "Ce format de pièce jointe n'est pas autorisé. Utilisez une image, un PDF ou un document courant.",
      );
    }
  }
}

function validateMessageContent(data: SendMessageData, context: z.RefinementCtx): void {
  const hasContent = data.content.trim().length > 0;
  if (data.messageKind === "message" && (hasContent || data.attachmentUrl || data.attachmentPath)) return;
  if (data.messageKind !== "message" && hasContent) return;

  addIssue(
    context,
    ["content"],
    data.messageKind === "message"
      ? "Un message standard doit contenir du texte ou une pièce jointe valide."
      : "Le contenu est requis pour ce type de message.",
  );
}

export const sendMessageSchema = z.object({
  channelType: z.enum(CHANNEL_TYPES),
  content: z.string().max(2000).default(""),
  messageKind: z.enum(CHAT_MESSAGE_KINDS).optional().default("message"),
  pollOptions: z.array(z.string()).optional(),
  relatedEventId: z.string().uuid().optional(),
  topicId: z.string().optional(),
  actionId: z.string().uuid().optional(),
  feedbackId: z.string().trim().min(1).max(200).optional(),
  operationId: z.string().trim().min(1).max(200).optional(),
  recipientId: z.string().optional(),
  arrondissementId: z.number().int().min(1).max(20).optional(),
  zoneName: z.string().optional(),
  attachmentUrl: z.string().trim().url().refine(isSafeChatAttachmentUrl, {
    message: "L'URL de la pièce jointe doit utiliser http(s).",
  }).optional(),
  attachmentPath: z.string().trim().min(1).max(512).optional(),
  attachmentType: z.string().trim().refine((value) => !isUnsupportedChatVideoMimeType(value), {
    message: CHAT_VIDEO_UNSUPPORTED_MESSAGE,
  }).optional(),
  attachmentSize: z.number().int().nonnegative().optional(),
}).superRefine((data, context) => {
  validateAttachmentContract(data, context);
  validateMessageContent(data, context);
  if (data.messageKind === "poll" && data.attachmentPath) {
    addIssue(context, ["attachmentPath"], "Un sondage ne peut pas contenir de pièce jointe ou d'événement.");
  }
  if (
    data.actionId &&
    data.channelType !== "action" &&
    (data.attachmentPath || data.attachmentUrl || data.attachmentType)
  ) {
    addIssue(context, ["attachmentPath"], "Le partage d'action ne peut pas contenir de pièce jointe.");
  }
  if (data.feedbackId && data.attachmentPath) {
    addIssue(context, ["attachmentPath"], "Une réponse feedback ne peut pas contenir de pièce jointe.");
  }
});

export function sendMessageSchemaForUser(userId: string) {
  return sendMessageSchema.superRefine((data, context) => {
    if (
      data.attachmentPath &&
      !isChatAttachmentPathOwnedByUser({
        path: data.attachmentPath,
        channelType: data.channelType,
        userId,
      })
    ) {
      addIssue(context, ["attachmentPath"], "Le chemin de la pièce jointe n'appartient pas à votre upload Chat.");
    }
  });
}

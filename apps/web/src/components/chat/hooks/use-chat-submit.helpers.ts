import type { SupabaseClient } from "@supabase/supabase-js";
import type { Dispatch, SetStateAction } from "react";
import { isAppError, toAppError } from "@/lib/errors/app-errors";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import { compressImageFile } from "@/lib/media/image-compression";
import {
  getChatAttachmentValidationError,
  inferChatAttachmentExtension,
  inferChatAttachmentType,
  isChatImageFile,
} from "@/lib/chat/chat-attachments";
import type { ChatUser } from "../chat-types";
import type { ChatChannelType } from "@/lib/chat/channels";
import { buildStorageBusinessMetadata } from "@/lib/supabase/storage-business-classification";

export class ChatAttachmentValidationError extends Error {}

async function prepareChatAttachment(file: File): Promise<{
  file: File;
  type: string | undefined;
}> {
  const preparedFile = isChatImageFile(file)
    ? await compressImageFile(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.8,
      })
    : file;
  const validationError = getChatAttachmentValidationError(preparedFile);
  if (validationError) {
    throw new ChatAttachmentValidationError(validationError);
  }
  return {
    file: preparedFile,
    type: inferChatAttachmentType(preparedFile) ?? (preparedFile.type || file.type || undefined),
  };
}

async function uploadPreparedChatAttachment(params: {
  originalFile: File;
  preparedFile: File;
  inferredAttachmentType: string | undefined;
  supabase: SupabaseClient;
  userId: string;
  activeChannelType: ChatChannelType;
  setIsUploading: (value: boolean) => void;
}): Promise<{ url: string; type: string | undefined; size: number }> {
  const fileExt = inferChatAttachmentExtension(params.preparedFile) ?? "bin";
  const fileName = `${params.userId}-${Math.random().toString(36).slice(2)}.${fileExt}`;
  const filePath = `${params.activeChannelType}/${fileName}`;
  const attachmentMimeType =
    params.inferredAttachmentType ?? params.preparedFile.type ?? params.originalFile.type ?? null;
  const businessDomain = params.inferredAttachmentType?.startsWith("image/")
    ? "pieces_jointes_photo"
    : params.inferredAttachmentType
      ? "pieces_jointes_document"
      : "messages";

  params.setIsUploading(true);
  try {
    const { error: uploadError } = await params.supabase.storage
      .from("chat-attachments")
      .upload(filePath, params.preparedFile, {
        metadata: buildStorageBusinessMetadata({
          businessDomain,
          sourceTable: "messages",
          businessContext: "chat_attachment",
          extra: {
            channelType: params.activeChannelType,
            attachmentType: attachmentMimeType,
          },
        }),
      });
    if (uploadError) throw uploadError;

    const { data: signedUrl, error: signedUrlError } = await params.supabase.storage
      .from("chat-attachments")
      .createSignedUrl(filePath, 120 * 24 * 60 * 60);
    if (signedUrlError || !signedUrl?.signedUrl) {
      throw signedUrlError ?? new Error("La signature de la pièce jointe a échoué.");
    }

    return {
      url: signedUrl.signedUrl,
      type: params.inferredAttachmentType ?? (params.preparedFile.type || params.originalFile.type || undefined),
      size: params.preparedFile.size,
    };
  } finally {
    params.setIsUploading(false);
  }
}

async function uploadChatAttachment(params: {
  file: File;
  supabase: SupabaseClient;
  userId: string;
  activeChannelType: ChatChannelType;
  setIsUploading: (value: boolean) => void;
}): Promise<{ url: string; type: string | undefined; size: number }> {
  const prepared = await prepareChatAttachment(params.file);
  return uploadPreparedChatAttachment({
    originalFile: params.file,
    preparedFile: prepared.file,
    inferredAttachmentType: prepared.type,
    supabase: params.supabase,
    userId: params.userId,
    activeChannelType: params.activeChannelType,
    setIsUploading: params.setIsUploading,
  });
}

export function getChatSubmitPreconditionError(params: {
  submitLocked: boolean;
  userId?: string;
  currentMessage: string;
  file: File | null;
  isSending: boolean;
  isUploading: boolean;
  activeChannelType: ChatChannelType;
  selectedRecipient: ChatUser | null;
  activeActionId?: string | null;
  effectiveZone: string;
  territoryFocus: number | null;
}): string | null {
  if (params.submitLocked) return "Un envoi est déjà en cours. Réessayez dans un instant.";
  if (!params.userId) return "Connectez-vous pour envoyer un message.";
  if ((!params.currentMessage && !params.file) || params.isSending || params.isUploading) return "";
  if (params.activeChannelType === "dm" && !params.selectedRecipient) {
    return "Choisissez un destinataire pour envoyer un message privé.";
  }
  if (params.activeChannelType === "action" && !params.activeActionId) {
    return "Sélectionnez une action publiée avant d'écrire.";
  }
  if (params.activeChannelType === "territory" && !params.effectiveZone && params.territoryFocus === null) {
    return "Choisissez une zone (arrondissement ou commune) avant d'écrire dans ce canal.";
  }
  return null;
}

export async function uploadChatAttachmentIfNeeded(params: {
  file: File | null;
  supabase: SupabaseClient | null | undefined;
  userId: string;
  activeChannelType: ChatChannelType;
  setIsUploading: (value: boolean) => void;
}): Promise<{ url: string; type: string | undefined; size: number } | null> {
  if (!params.file) return null;
  if (!params.supabase) {
    throw new ChatAttachmentValidationError(
      "Les pièces jointes nécessitent une configuration Supabase locale valide.",
    );
  }
  return uploadChatAttachment({
    file: params.file,
    supabase: params.supabase,
    userId: params.userId,
    activeChannelType: params.activeChannelType,
    setIsUploading: params.setIsUploading,
  });
}

export function reportChatAttachmentError(
  error: unknown,
  params: {
    setSendError: Dispatch<SetStateAction<string | null>>;
    retrySubmitChatMessage: () => void;
  },
): void {
  if (error instanceof ChatAttachmentValidationError) {
    params.setSendError(error.message);
    return;
  }
  const appError = isAppError(error)
    ? error
    : toAppError(error, {
        kind: "network",
        message: "L'ajout de la pièce jointe a échoué. Vérifie la connexion puis réessaie.",
      });
  params.setSendError(appError.message);
  notifyNetworkToast({
    title: "Pièce jointe indisponible",
    message: appError.message,
    retryLabel: "Réessayer l'upload",
    onRetry: params.retrySubmitChatMessage,
    refreshLabel: "Rafraîchir",
    onRefresh: () => window.location.reload(),
  });
}

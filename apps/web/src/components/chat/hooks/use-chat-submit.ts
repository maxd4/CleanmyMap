import { useCallback, useMemo } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { useUser } from "@clerk/nextjs";
import { isAppError, toAppError } from "@/lib/errors/app-errors";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import { compressImageFile } from "@/lib/media/image-compression";
import {
  inferChatAttachmentExtension,
  inferChatAttachmentType,
} from "@/lib/chat/chat-attachments";
import type { ChatMessage, ChatUser } from "../chat-types";
import type { ChatChannelType } from "@/lib/chat/channels";

type UseChatSubmitParams = {
  submitLockRef: React.MutableRefObject<boolean>;
  userId?: string;
  user: ReturnType<typeof useUser>["user"];
  message: string;
  file: File | null;
  isSending: boolean;
  isUploading: boolean;
  activeChannelType: ChatChannelType;
  selectedRecipient: ChatUser | null;
  effectiveZone: string;
  territoryFocus: number | null;
  setIsSending: React.Dispatch<React.SetStateAction<boolean>>;
  setSendError: React.Dispatch<React.SetStateAction<string | null>>;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  supabase: SupabaseClient;
  sendChatMessage: (params: { optimisticMessage: ChatMessage; body: any }) => Promise<void>;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  setFile: React.Dispatch<React.SetStateAction<File | null>>;
  setShowMentions: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useChatSubmit({
  submitLockRef,
  userId,
  user,
  message,
  file,
  isSending,
  isUploading,
  activeChannelType,
  selectedRecipient,
  effectiveZone,
  territoryFocus,
  setIsSending,
  setSendError,
  setIsUploading,
  supabase,
  sendChatMessage,
  setMessage,
  setFile,
  setShowMentions,
}: UseChatSubmitParams) {
  const submitChatMessage = useCallback(async () => {
    if (submitLockRef.current) {
      setSendError("Un envoi est déjà en cours. Réessayez dans un instant.");
      return;
    }

    const currentMessage = message.trim();

    if (!userId) {
      setSendError("Connectez-vous pour envoyer un message.");
      return;
    }

    if ((!currentMessage && !file) || isSending || isUploading) {
      return;
    }

    if (activeChannelType === "dm" && !selectedRecipient) {
      setSendError("Choisissez un destinataire pour envoyer un message privé.");
      return;
    }

    if (activeChannelType === "territory" && !effectiveZone && territoryFocus === null) {
      setSendError(
        "Ajoutez une zone (arrondissement ou commune) à votre profil avant d'écrire dans ce canal.",
      );
      return;
    }

    submitLockRef.current = true;
    setIsSending(true);
    setSendError(null);

    let attachmentUrl: string | undefined;
    let attachmentType: string | undefined;

    try {
      if (file) {
        setIsUploading(true);

        try {
          const preparedFile = file.type.startsWith("image/")
            ? await compressImageFile(file, {
                maxWidth: 1600,
                maxHeight: 1600,
                quality: 0.8,
              })
            : file;
          const fileExt = inferChatAttachmentExtension(preparedFile) ?? "bin";
          const fileName = `${userId}-${Math.random().toString(36).slice(2)}.${fileExt}`;
          const filePath = `${activeChannelType}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("chat-attachments")
            .upload(filePath, preparedFile);

          if (uploadError) {
            throw uploadError;
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from("chat-attachments").getPublicUrl(filePath);

          attachmentUrl = publicUrl;
          const inferredAttachmentType = inferChatAttachmentType(preparedFile);
          attachmentType = inferredAttachmentType ?? (preparedFile.type || file.type || undefined);
        } catch (uploadError) {
          const appError = isAppError(uploadError)
            ? uploadError
            : toAppError(uploadError, {
                kind: "network",
                message:
                  "L'ajout de la pièce jointe a échoué. Vérifie la connexion puis réessaie.",
              });

          setSendError(appError.message);
          notifyNetworkToast({
            title: "Pièce jointe indisponible",
            message: appError.message,
            retryLabel: "Réessayer l'upload",
            onRetry: () => void submitChatMessage(),
            refreshLabel: "Rafraîchir",
            onRefresh: () => window.location.reload(),
          });
          return;
        } finally {
          setIsUploading(false);
        }
      }

      const optimisticMsg: ChatMessage = {
        id: `opt-${Date.now()}`,
        sender_id: userId,
        content: currentMessage,
        channel_type: activeChannelType,
        attachment_url: attachmentUrl,
        created_at: new Date().toISOString(),
        sender: {
          display_name: user?.fullName || user?.username || "Moi",
          handle: user?.username || "moi",
          avatar_url: user?.imageUrl || "",
        },
      };

      await sendChatMessage({
        optimisticMessage: optimisticMsg,
        body: {
          channelType: activeChannelType,
          content: currentMessage,
          recipientId:
            activeChannelType === "dm" ? selectedRecipient?.id : undefined,
          arrondissementId:
            activeChannelType === "territory" && !effectiveZone
              ? territoryFocus ?? undefined
              : undefined,
          zoneName:
            activeChannelType === "territory" && effectiveZone
              ? effectiveZone
              : undefined,
          attachmentUrl,
          attachmentType,
        },
      });

      setMessage("");
      setFile(null);
      setShowMentions(false);
      setSendError(null);
    } catch (err) {
      const appError = isAppError(err)
        ? err
        : toAppError(err, {
            kind: "server",
            message:
              "Une erreur est survenue lors de l'envoi de votre message. Réessaye dans un instant.",
          });

      setSendError(appError.message);

      if (appError.kind === "network") {
        notifyNetworkToast({
          title: "Connexion perdue",
          message: appError.message,
          retryLabel: "Réessayer maintenant",
          onRetry: () => void submitChatMessage(),
          refreshLabel: "Rafraîchir",
          onRefresh: () => window.location.reload(),
        });
      }
    } finally {
      setIsSending(false);
      submitLockRef.current = false;
    }
  }, [
    activeChannelType,
    effectiveZone,
    file,
    isSending,
    isUploading,
    message,
    selectedRecipient,
    sendChatMessage,
    setFile,
    setIsSending,
    setIsUploading,
    setMessage,
    setSendError,
    setShowMentions,
    submitLockRef,
    supabase,
    territoryFocus,
    user,
    userId,
  ]);

  const handleSend = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    void submitChatMessage();
  }, [submitChatMessage]);

  return useMemo(() => ({ submitChatMessage, handleSend }), [submitChatMessage, handleSend]);
}

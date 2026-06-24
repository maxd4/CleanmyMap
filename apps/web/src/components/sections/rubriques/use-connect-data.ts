"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isChatChannelType, type ChatChannelType } from "@/lib/chat/channels";
import type { ChatUser } from "@/components/chat/chat-types";
import type { ConnectTab, CommunityAnnouncementTemplateKey } from "./connect-types";

export function useConnectData(defaultTab: ConnectTab = "discussions") {
  const [activeTab, setActiveTab] = useState<ConnectTab>(defaultTab);
  const searchParams = useSearchParams();

  const requestedTab = searchParams.get("tab");
  const requestedChannel = searchParams.get("channel");
  const requestedRecipientId = searchParams.get("recipientId");
  const requestedRecipientLabel = searchParams.get("recipientLabel");
  const requestedRecipientHandle = searchParams.get("recipientHandle");
  const requestedZoneName = searchParams.get("zoneName");
  const requestedArrondissement = Number.parseInt(searchParams.get("arrondissementId") ?? "", 10);
  const requestedTemplate = searchParams.get("template");
  const requestedEventId = searchParams.get("eventId");

  const initialChannelType: ChatChannelType = isChatChannelType(requestedChannel)
    ? requestedChannel
    : defaultTab === "dm" || requestedTab === "dm"
      ? "dm"
      : "community";

  const initialRecipient: ChatUser | null = useMemo(() => 
    initialChannelType === "dm" && requestedRecipientId
      ? {
          id: requestedRecipientId,
          display_name: requestedRecipientLabel?.trim() || requestedRecipientHandle?.trim() || "Membre",
          handle: requestedRecipientHandle?.trim() || requestedRecipientId.slice(0, 8),
          avatar_url: null,
        }
      : null, [initialChannelType, requestedRecipientId, requestedRecipientLabel, requestedRecipientHandle]);

  const initialTab: ConnectTab = useMemo(() =>
    requestedTab === "dm" || initialChannelType === "dm" || defaultTab === "dm"
      ? "dm"
      : "discussions", [requestedTab, initialChannelType, defaultTab]);

  const initialArrondissement = Number.isInteger(requestedArrondissement)
    ? requestedArrondissement
    : 11;
    
  const initialZoneName = requestedZoneName?.trim().length ? requestedZoneName.trim() : null;

  const initialAnnouncementTemplate = useMemo(() =>
    requestedTemplate === "relais_associatif" ||
    requestedTemplate === "benevoles" ||
    requestedTemplate === "diffusion"
      ? requestedTemplate
      : null, [requestedTemplate]);

  const [announcementTemplate, setAnnouncementTemplate] = useState<CommunityAnnouncementTemplateKey | null>(
    initialAnnouncementTemplate,
  );

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const communityInitialMessage = useMemo(() => 
    {
      const buildAnnouncementTemplate = (
        template: CommunityAnnouncementTemplateKey | null,
      ): string => {
        if (!template) {
          return "";
        }

        const eventSuffix = requestedEventId?.trim().length
          ? `\nCleanup associé: ${requestedEventId.trim()}`
          : "";

        if (template === "relais_associatif") {
          return `Besoin de relais associatif\nContexte: je cherche une association pour relayer un cleanup.${eventSuffix}\nAction attendue: diffusion et prise de contact.`;
        }

        if (template === "benevoles") {
          return `Besoin de bénévoles\nContexte: je coordonne un cleanup et j'ai besoin de renfort sur le terrain.${eventSuffix}\nAction attendue: mobilisation de volontaires.`;
        }

        return `Besoin de diffusion\nContexte: je veux relayer un cleanup auprès d'un réseau plus large.${eventSuffix}\nAction attendue: partage du message et relais local.`;
      };

      return buildAnnouncementTemplate(announcementTemplate);
    }, 
    [announcementTemplate, requestedEventId]
  );

  const discussionShellKey = `discussions:${initialChannelType}:${initialRecipient?.id ?? "none"}:${initialArrondissement}:${initialZoneName ?? "no-zone"}:${announcementTemplate ?? "none"}`;
  const dmShellKey = `dm:${initialRecipient?.id ?? "none"}:${initialArrondissement}:${initialZoneName ?? "no-zone"}`;

  return {
    activeTab,
    setActiveTab,
    initialChannelType,
    initialRecipient,
    initialArrondissement,
    initialZoneName,
    announcementTemplate,
    setAnnouncementTemplate,
    communityInitialMessage,
    discussionShellKey,
    dmShellKey,
  };
}

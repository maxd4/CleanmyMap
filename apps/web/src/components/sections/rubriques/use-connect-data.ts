"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { isChatChannelType, type ChatChannelType } from "@/lib/chat/channels";
import { parseChatTopicIdForChannel } from "@/lib/chat/topics";
import type { ChatTopicId } from "@/lib/chat/topics";
import {
  buildAnnouncementDraft,
  getAnnouncementTopicId,
  isCommunityAnnouncementTemplateKey,
  type ChatRelatedEvent,
  type CommunityAnnouncementTemplateKey,
} from "@/lib/chat/announcements";
import type { ChatUser } from "@/components/chat/chat-types";
import type { ConnectTab } from "./connect-types";

type CommunityEventReferenceResponse = {
  items?: Array<{
    id: string;
    title: string;
    eventDate: string;
    locationLabel: string;
  }>;
};

async function fetchCommunityEventReference(url: string): Promise<CommunityEventReferenceResponse> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Impossible de charger le cleanup associé.");
  }
  return (await response.json()) as CommunityEventReferenceResponse;
}

export function buildInitialDmRecipient({
  channelType,
  recipientId,
  recipientLabel,
  recipientHandle,
}: {
  channelType: ChatChannelType;
  recipientId: string | null;
  recipientLabel: string | null;
  recipientHandle: string | null;
}): ChatUser | null {
  if (channelType !== "dm" || !recipientId) {
    return null;
  }

  return {
    id: recipientId,
    display_name: recipientLabel?.trim() || recipientHandle?.trim() || "Membre",
    handle: recipientHandle?.trim() || recipientId.slice(0, 8),
    avatar_url: null,
  };
}

export function buildInitialTopicId(
  channelType: ChatChannelType,
  topicId: string | null,
) {
  return parseChatTopicIdForChannel(channelType, topicId);
}

export function buildInitialAnnouncementTemplate(
  template: string | null,
): CommunityAnnouncementTemplateKey | null {
  return isCommunityAnnouncementTemplateKey(template) ? template : null;
}

export function useConnectData(defaultTab: ConnectTab = "discussions") {
  const [activeTab, setActiveTab] = useState<ConnectTab>(defaultTab);
  const searchParams = useSearchParams();

  const requestedTab = searchParams.get("tab");
  const requestedChannel = searchParams.get("channel");
  const requestedRecipientId = searchParams.get("recipientId");
  const requestedRecipientLabel = searchParams.get("recipientLabel");
  const requestedRecipientHandle = searchParams.get("recipientHandle");
  const requestedMessageId = searchParams.get("messageId");
  const requestedTopicId = searchParams.get("topicId");
  const requestedZoneName = searchParams.get("zoneName");
  const requestedArrondissement = Number.parseInt(searchParams.get("arrondissementId") ?? "", 10);
  const requestedTemplate = searchParams.get("template");
  const requestedEventId = searchParams.get("eventId");

  const requestedAnnouncementTemplate = buildInitialAnnouncementTemplate(requestedTemplate);

  const initialChannelType: ChatChannelType = requestedAnnouncementTemplate
    ? "community"
    : isChatChannelType(requestedChannel)
    ? requestedChannel
    : defaultTab === "dm" || requestedTab === "dm"
      ? "dm"
      : "community";

  const initialRecipient: ChatUser | null = useMemo(
    () =>
      buildInitialDmRecipient({
        channelType: initialChannelType,
        recipientId: requestedRecipientId,
        recipientLabel: requestedRecipientLabel,
        recipientHandle: requestedRecipientHandle,
      }),
    [initialChannelType, requestedRecipientId, requestedRecipientLabel, requestedRecipientHandle],
  );

  const initialTopicId: ChatTopicId | null = useMemo(() => {
    if (requestedAnnouncementTemplate) {
      return getAnnouncementTopicId(requestedAnnouncementTemplate);
    }
    return buildInitialTopicId(initialChannelType, requestedTopicId);
  }, [initialChannelType, requestedAnnouncementTemplate, requestedTopicId]);

  const initialAnnouncementTemplate = requestedAnnouncementTemplate;
  const eventReferenceKey =
    initialAnnouncementTemplate && requestedEventId
      ? `/api/community/events?eventId=${encodeURIComponent(requestedEventId)}&limit=1`
      : null;
  const {
    data: eventReferenceData,
    error: eventReferenceError,
    isLoading: isAnnouncementEventLoading,
  } = useSWR<CommunityEventReferenceResponse>(
    eventReferenceKey,
    fetchCommunityEventReference,
  );

  const initialRelatedEvent: ChatRelatedEvent | null = useMemo(() => {
    const event = eventReferenceData?.items?.[0];
    return event
      ? {
          id: event.id,
          title: event.title,
          event_date: event.eventDate,
          location_label: event.locationLabel,
        }
      : null;
  }, [eventReferenceData]);

  const initialTab: ConnectTab = useMemo(() =>
    requestedAnnouncementTemplate
      ? "discussions"
      : requestedTab === "dm" || initialChannelType === "dm" || defaultTab === "dm"
      ? "dm"
      : "discussions", [defaultTab, initialChannelType, requestedAnnouncementTemplate, requestedTab]);

  const initialArrondissement = Number.isInteger(requestedArrondissement)
    ? requestedArrondissement
    : 11;
    
  const initialZoneName = requestedZoneName?.trim().length ? requestedZoneName.trim() : null;

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const initialMessageId = requestedMessageId?.trim() || null;
  const discussionShellKey = `discussions:${initialChannelType}:${initialTopicId ?? "global"}:${initialRecipient?.id ?? "none"}:${initialArrondissement}:${initialZoneName ?? "no-zone"}:${initialAnnouncementTemplate ?? "none"}:${requestedEventId ?? "none"}:${initialMessageId ?? "none"}`;
  const dmShellKey = `dm:${initialRecipient?.id ?? "none"}:${initialArrondissement}:${initialZoneName ?? "no-zone"}:${initialMessageId ?? "none"}`;

  return {
    activeTab,
    setActiveTab,
    initialChannelType,
    initialRecipient,
    initialTopicId,
    initialComposerMode: initialAnnouncementTemplate ? ("announcement" as const) : ("message" as const),
    initialAnnouncementTemplate,
    initialMessage: initialAnnouncementTemplate
      ? buildAnnouncementDraft(initialAnnouncementTemplate)
      : "",
    initialRelatedEvent,
    announcementEventRequested: Boolean(initialAnnouncementTemplate && requestedEventId),
    announcementEventLoading: isAnnouncementEventLoading,
    announcementEventError: eventReferenceError ?? null,
    initialArrondissement,
    initialZoneName,
    initialMessageId,
    discussionShellKey,
    dmShellKey,
  };
}

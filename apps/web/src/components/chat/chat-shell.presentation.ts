import type { ActionListItem } from "@/lib/actions/types";
import {
  getChatChannelDefinition,
  type ChatChannelType,
} from "@/lib/chat/channels";
import {
  getChatTopicPresentationGroup,
  getChatTopicPresentationGroups,
  type ChatTopicPresentationGroup,
} from "@/lib/chat/topic-presentation";
import type { ChatTopicId } from "@/lib/chat/topics";
import { formatBusinessDurationMinutes } from "@/lib/actions/time-contract";
import type { ChatUser } from "./chat-types";
import {
  CHANNEL_VISUALS,
  getChannelPlaceholder,
  getChannelTitle,
  getEmptyStateCopy,
  type ChannelVisual,
  type ChatEmptyStateCopy,
  type ChatMetaItem,
} from "./chat-shell.utils";

export type ChatShellPresentation = {
  territoryLabel: string | null;
  recipientLabel: string | null;
  activeChannelDefinition: ReturnType<typeof getChatChannelDefinition>;
  activeAction: ActionListItem | null;
  activeTopic: ChatTopicPresentationGroup | null;
  channelTopics: ChatTopicPresentationGroup[];
  discussionGuidance: ChatEmptyStateCopy;
  metaItems: ChatMetaItem[];
  activeChannelVisual: ChannelVisual;
  activeChannelLabel: string;
  activeChannelDescription: string;
  composerPlaceholder: string;
};

function getActiveChannelDescription({
  activeAction,
  activeChannelDefinition,
  discussionGuidance,
}: {
  activeAction: ActionListItem | null;
  activeChannelDefinition: ReturnType<typeof getChatChannelDefinition>;
  discussionGuidance: ChatEmptyStateCopy;
}): string {
  return activeAction
    ? `${activeAction.location_label} · ${activeAction.action_date} · ${activeAction.association_name || activeAction.actor_name || "Organisateur non renseigné"}`
    : discussionGuidance.cardSummary || activeChannelDefinition.description;
}

function getChatShellMetaItems({
  locale,
  activeChannelType,
  activeAction,
  activeTopic,
  discussionGuidance,
  isLive,
}: {
  locale: "fr" | "en";
  activeChannelType: ChatChannelType;
  activeAction: ActionListItem | null;
  activeTopic: ChatTopicPresentationGroup | null;
  discussionGuidance: ChatEmptyStateCopy;
  isLive: boolean;
}): ChatMetaItem[] {
  const isFrench = locale === "fr";
  const actionMetaItems = activeAction
    ? getActiveActionMetaItems({ activeAction, isFrench })
    : [];
  const topicMetaItems = activeTopic
    ? [{
        label: isFrench ? "Salon" : "Topic",
        value: activeTopic.label,
      }]
    : [];
  return [
    {
      label: isFrench ? "Canal" : "Channel",
      value: activeAction ? "Actions" : getChannelTitle(activeChannelType),
    },
    ...actionMetaItems,
    ...topicMetaItems,
    {
      label: isFrench ? "Audience" : "Audience",
      value: discussionGuidance.audienceLabel,
    },
    {
      label: isFrench ? "Visibilité" : "Visibility",
      value: discussionGuidance.visibilityLabel,
    },
    {
      label: isFrench ? "Statut" : "Status",
      value: isLive ? (isFrench ? "Direct" : "Live") : "Polling",
    },
  ];
}

function getActiveActionMetaItems({
  activeAction,
  isFrench,
}: {
  activeAction: ActionListItem;
  isFrench: boolean;
}): ChatMetaItem[] {
  return [
    { label: isFrench ? "Date" : "Date", value: activeAction.action_date },
    { label: isFrench ? "Lieu" : "Location", value: activeAction.location_label },
    {
      label: isFrench ? "Organisateur" : "Organizer",
      value: activeAction.association_name || activeAction.actor_name || "—",
    },
    {
      label: isFrench ? "Participants prévus" : "Planned participants",
      value: String(
        activeAction.contract?.metadata.preparationData?.volunteerParticipation
          ?.participantsCount ?? activeAction.volunteers_count,
      ),
    },
    {
      label: isFrench ? "Durée estimée" : "Estimated duration",
      value: formatBusinessDurationMinutes(activeAction.duration_minutes),
    },
  ];
}

type ChatShellPresentationParams = {
  activeChannelType: ChatChannelType;
  activeTopicId: ChatTopicId | null;
  selectedActionId: string | null;
  selectedRecipient: ChatUser | null;
  effectiveZone: string;
  territoryFocus: number | null;
  locale: "fr" | "en";
  actionItems: ActionListItem[];
  isLive: boolean;
};

export function getChatShellPresentation({
  activeChannelType,
  activeTopicId,
  selectedActionId,
  selectedRecipient,
  effectiveZone,
  territoryFocus,
  locale,
  actionItems,
  isLive,
}: ChatShellPresentationParams): ChatShellPresentation {
  const territoryLabel =
    effectiveZone ||
    (territoryFocus ? `${territoryFocus}e arrondissement` : null);
  const recipientLabel = selectedRecipient?.display_name ?? selectedRecipient?.handle ?? null;
  const activeChannelDefinition = getChatChannelDefinition(activeChannelType);
  const activeAction = actionItems.find((item) => item.id === selectedActionId) ?? null;
  const activeTopic = getChatTopicPresentationGroup(activeChannelType, activeTopicId);
  const channelTopics = getChatTopicPresentationGroups(activeChannelType);
  const discussionGuidance = getEmptyStateCopy(
    activeChannelType,
    locale,
    recipientLabel,
    territoryLabel,
    activeTopicId,
  );
  const metaItems = getChatShellMetaItems({
    locale,
    activeChannelType,
    activeAction,
    activeTopic,
    discussionGuidance,
    isLive,
  });
  const activeChannelVisual = CHANNEL_VISUALS[activeChannelType];

  return {
    territoryLabel,
    recipientLabel,
    activeChannelDefinition,
    activeAction,
    activeTopic,
    channelTopics,
    discussionGuidance,
    metaItems,
    activeChannelVisual,
    activeChannelLabel: activeAction
      ? activeAction.contract?.metadata.preparationData?.actionTitle?.trim() || activeAction.location_label
      : getChannelTitle(activeChannelType),
    activeChannelDescription: getActiveChannelDescription({
      activeAction,
      activeChannelDefinition,
      discussionGuidance,
    }),
    composerPlaceholder: activeAction
      ? "Écrivez un message de coordination pour cette action."
      : getChannelPlaceholder(activeChannelType),
  };
}

export function getChatShellMobilePresentation({
  messagerieMode,
  activeChannelType,
  selectedRecipient,
  isDmThreadOpen,
  isPublicThreadOpen,
}: {
  messagerieMode: boolean;
  activeChannelType: ChatChannelType;
  selectedRecipient: ChatUser | null;
  isDmThreadOpen: boolean;
  isPublicThreadOpen: boolean;
}) {
  const isDmSurface = messagerieMode && activeChannelType === "dm";
  const showDmThreadOnMobile = !isDmSurface || Boolean(selectedRecipient) || isDmThreadOpen;
  const showPublicThreadOnMobile = !messagerieMode || isDmSurface || isPublicThreadOpen;
  const showThreadOnMobile = isDmSurface
    ? showDmThreadOnMobile
    : showPublicThreadOnMobile;

  return {
    isDmSurface,
    showDmThreadOnMobile,
    showPublicThreadOnMobile,
    showThreadOnMobile,
  };
}

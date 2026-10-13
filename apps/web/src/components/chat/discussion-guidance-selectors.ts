import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatTopicId } from "@/lib/chat/topics";
import { CHAT_TOPIC_DEFINITIONS, GUIDANCE, type ChatTopicDefinition, type DiscussionGuidance, type GuidanceOptions } from "./discussion-guidance";

export function getDiscussionTopics(channelType: ChatChannelType): ChatTopicDefinition[] {
  return CHAT_TOPIC_DEFINITIONS[channelType] ?? [];
}

export function getDiscussionTopic(channelType: ChatChannelType, topicId: ChatTopicId | null | undefined): ChatTopicDefinition | null {
  if (!topicId) return null;
  return getDiscussionTopics(channelType).find((topic) => topic.id === topicId) ?? null;
}

function topicLabels(topic: ChatTopicDefinition | null, locale: GuidanceOptions["locale"]) {
  if (!topic) return { label: null, description: null, starterPrompt: null };
  return {
    label: locale === "en" ? topic.labelEn ?? topic.label : topic.label,
    description: locale === "en" ? topic.descriptionEn ?? topic.description : topic.description,
    starterPrompt: locale === "en" ? topic.starterPromptEn ?? topic.starterPrompt : topic.starterPrompt,
  };
}

function emptyState(channelType: ChatChannelType, options: GuidanceOptions, defaults: { title: string; description: string }) {
  if (channelType === "dm" && options.recipientLabel) {
    return options.locale === "fr"
      ? { title: `Aucun message privé avec ${options.recipientLabel}`, description: "Votre conversation démarre ici. Envoyez un premier message pour lancer l'échange." }
      : { title: `No private messages with ${options.recipientLabel}`, description: "Your conversation starts here. Send a first message to begin the exchange." };
  }
  if (channelType === "territory" && options.territoryLabel) {
    return options.locale === "fr"
      ? { title: `Aucun message pour ${options.territoryLabel}`, description: "Partagez ici les sujets liés à votre zone et aux zones limitrophes." }
      : { title: `No messages for ${options.territoryLabel}`, description: "Share topics tied to your zone and nearby areas here." };
  }
  return defaults;
}

export function getDiscussionGuidance(channelType: ChatChannelType, options: GuidanceOptions, topicId?: ChatTopicId | null): DiscussionGuidance {
  const localeData = GUIDANCE[channelType][options.locale];
  const topic = getDiscussionTopic(channelType, topicId);
  const { label: topicLabel, description: topicDescription, starterPrompt: topicStarterPrompt } = topicLabels(topic, options.locale);
  const empty = emptyState(channelType, options, { title: localeData.emptyTitle, description: localeData.emptyDescription });
  return {
    cardTitle: localeData.cardTitle,
    cardSummary: topicDescription ?? localeData.cardSummary,
    visibilityLabel: localeData.visibilityLabel(options),
    audienceLabel: localeData.audienceLabel(options),
    purposeTags: topicLabel ? [topicLabel, ...localeData.purposeTags.filter((tag) => tag !== topicLabel)] : localeData.purposeTags,
    messagePattern: localeData.messagePattern,
    emptyTitle: empty.title,
    emptyDescription: empty.description,
    starterTitle: localeData.starterTitle,
    starterPrompts: topic ? [topicStarterPrompt ?? topic.starterPrompt, ...localeData.starterPrompts.filter((prompt) => prompt !== topicStarterPrompt)] : localeData.starterPrompts,
    composerHint: localeData.composerHint,
    channelGoal: topicLabel ?? localeData.channelGoal,
  };
}

import type { ChatChannelType } from "./channels";
import {
  getDiscussionTopic,
  type ChatTopicDefinition,
} from "@/components/chat/discussion-guidance";
import type { ChatTopicId } from "./topics";

/**
 * Presentation-only grouping. The persisted topic_id values remain the
 * canonical message, notification and authorization granularity.
 */
export type ChatTopicPresentationGroup = ChatTopicDefinition & {
  topicIds: readonly ChatTopicId[];
};

type TopicPresentationSpec = {
  topicIds: readonly ChatTopicId[];
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
  starterPrompt: string;
  starterPromptEn: string;
};

const PRESENTATION_SPECS: Partial<Record<ChatChannelType, readonly TopicPresentationSpec[]>> = {
  community: [
    {
      topicIds: ["relais_associatif", "appel_aux_benevoles", "demande_diffusion"],
      label: "Mobiliser & relayer",
      labelEn: "Mobilize & relay",
      description: "Bénévoles, relais associatifs et diffusion.",
      descriptionEn: "Volunteers, association relays and distribution.",
      starterPrompt: "Je cherche des bénévoles ou un relais pour...",
      starterPromptEn: "I am looking for volunteers or a relay for...",
    },
    {
      topicIds: ["besoin_ressources"],
      label: "Ressources",
      labelEn: "Resources",
      description: "Partager ou trouver une ressource utile.",
      descriptionEn: "Share or find a useful resource.",
      starterPrompt: "Je cherche ou je peux proposer cette ressource...",
      starterPromptEn: "I am looking for or can offer this resource...",
    },
    {
      topicIds: ["coordination_secteur"],
      label: "Coordination",
      labelEn: "Coordination",
      description: "Coordonner un secteur et les prochaines étapes.",
      descriptionEn: "Coordinate an area and the next steps.",
      starterPrompt: "Pour coordonner ce secteur, je propose...",
      starterPromptEn: "To coordinate this area, I suggest...",
    },
  ],
  territory: [
    {
      topicIds: ["mon_territoire", "territoires_voisins"],
      label: "Territoire",
      labelEn: "Territory",
      description: "Un fil local piloté par la zone et son voisinage.",
      descriptionEn: "One local thread driven by the selected area and nearby areas.",
      starterPrompt: "Dans ce territoire, j'ai observé...",
      starterPromptEn: "In this territory, I observed...",
    },
  ],
  admin_elu: [
    {
      topicIds: ["arbitrages", "priorites"],
      label: "Arbitrages & priorités",
      labelEn: "Trade-offs & priorities",
      description: "Arbitrer et fixer les priorités de pilotage.",
      descriptionEn: "Make trade-offs and set steering priorities.",
      starterPrompt: "Je soumets cet arbitrage ou cette priorité...",
      starterPromptEn: "I am raising this trade-off or priority...",
    },
    {
      topicIds: ["suivi_decisions"],
      label: "Suivi des décisions",
      labelEn: "Decision follow-up",
      description: "Suivre les décisions et leurs prochaines étapes.",
      descriptionEn: "Track decisions and their next steps.",
      starterPrompt: "Voici le suivi de la décision...",
      starterPromptEn: "Here is the follow-up for the decision...",
    },
    {
      topicIds: ["coordination_institutionnelle"],
      label: "Coordination institutionnelle",
      labelEn: "Institutional coordination",
      description: "Coordonner les échanges avec les institutions.",
      descriptionEn: "Coordinate exchanges with institutions.",
      starterPrompt: "Pour la coordination institutionnelle, il faut...",
      starterPromptEn: "For institutional coordination, we need to...",
    },
  ],
};

function buildGroup(
  channelType: ChatChannelType,
  spec: TopicPresentationSpec,
): ChatTopicPresentationGroup | null {
  const anchorTopic = getDiscussionTopic(channelType, spec.topicIds[0]);
  if (!anchorTopic) return null;

  return {
    ...anchorTopic,
    id: anchorTopic.id,
    label: spec.label,
    labelEn: spec.labelEn,
    description: spec.description,
    descriptionEn: spec.descriptionEn,
    starterPrompt: spec.starterPrompt,
    starterPromptEn: spec.starterPromptEn,
    topicIds: spec.topicIds,
  };
}

export function getChatTopicPresentationGroups(
  channelType: ChatChannelType,
): ChatTopicPresentationGroup[] {
  const specs = PRESENTATION_SPECS[channelType];
  if (!specs) return [];
  return specs.flatMap((spec) => {
    const group = buildGroup(channelType, spec);
    return group ? [group] : [];
  });
}

export function getChatTopicPresentationGroup(
  channelType: ChatChannelType,
  topicId: ChatTopicId | null | undefined,
): ChatTopicPresentationGroup | null {
  if (!topicId) return null;
  return (
    getChatTopicPresentationGroups(channelType).find((group) =>
      group.topicIds.includes(topicId),
    ) ?? null
  );
}

/**
 * Returns the persisted topic filter for a selected presentation group.
 * Territory deliberately stays unfiltered so legacy/null topic messages remain
 * in the single zone-driven thread.
 */
export function getChatTopicIdsForPresentationScope(
  channelType: ChatChannelType,
  topicId: ChatTopicId | null | undefined,
): readonly ChatTopicId[] | null {
  if (!topicId || channelType === "territory") return null;
  const group = getChatTopicPresentationGroup(channelType, topicId);
  return group?.topicIds ?? [topicId];
}

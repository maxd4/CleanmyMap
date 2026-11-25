import type { ChatChannelType } from "./channels";
import type { ChatTopicPresentationGroup } from "./topic-presentation";

const priority: Record<string, readonly string[]> = {
  benevole: ["relais_associatif", "besoin_ressources", "coordination_secteur"],
  coordinateur: ["coordination_secteur", "relais_associatif", "besoin_ressources"],
  scientifique: ["besoin_ressources", "coordination_secteur", "relais_associatif"],
  entreprise: ["besoin_ressources", "relais_associatif", "coordination_secteur"],
  elu: ["coordination_secteur", "besoin_ressources", "relais_associatif"],
  admin: ["coordination_secteur", "relais_associatif", "besoin_ressources"],
  max: ["coordination_secteur", "relais_associatif", "besoin_ressources"],
};

/** Prioritize common topics, never grant permission. Existing channel guards
 * continue to control restricted topics and conversations. */
export function prioritizeChatTopics(groups: ChatTopicPresentationGroup[], role: string | null, channel: ChatChannelType) {
  if (channel !== "community" || !role || !priority[role]) return groups;
  const order = priority[role];
  const rank = (group: ChatTopicPresentationGroup) => {
    const index = order.findIndex(id => group.topicIds.some(topic => topic === id));
    return index === -1 ? order.length : index;
  };
  return [...groups].sort((a, b) => rank(a) - rank(b));
}

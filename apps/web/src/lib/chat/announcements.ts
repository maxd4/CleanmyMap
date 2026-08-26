import type { ChatTopicId } from "./topics";

export const CHAT_MESSAGE_KINDS = ["message", "announcement"] as const;
export type ChatMessageKind = (typeof CHAT_MESSAGE_KINDS)[number];

export const COMMUNITY_ANNOUNCEMENT_TEMPLATES = [
  {
    key: "relais_associatif",
    topicId: "relais_associatif",
    label: "Relais associatif",
    description: "Trouver une association relais pour une action.",
    draft:
      "Besoin de relais associatif\n\nJe cherche une association pour relayer cette action. Merci de me contacter si vous pouvez aider.",
  },
  {
    key: "benevoles",
    topicId: "appel_aux_benevoles",
    label: "Appel aux bénévoles",
    description: "Mobiliser du renfort sur le terrain.",
    draft:
      "Appel aux bénévoles\n\nJe cherche des volontaires pour renforcer cette action. Merci d’indiquer si vous pouvez participer.",
  },
  {
    key: "diffusion",
    topicId: "demande_diffusion",
    label: "Demande de diffusion",
    description: "Relayer une action auprès du réseau.",
    draft:
      "Demande de diffusion\n\nMerci de relayer cette action auprès des membres concernés et de me signaler les relais disponibles.",
  },
] as const satisfies ReadonlyArray<{
  key: string;
  topicId: ChatTopicId;
  label: string;
  description: string;
  draft: string;
}>;

export type CommunityAnnouncementTemplateKey =
  (typeof COMMUNITY_ANNOUNCEMENT_TEMPLATES)[number]["key"];

export type ChatRelatedEvent = {
  id: string;
  title: string;
  event_date: string;
  location_label: string;
};

export function isChatMessageKind(value: string | null | undefined): value is ChatMessageKind {
  return CHAT_MESSAGE_KINDS.includes(value as ChatMessageKind);
}

export function isCommunityAnnouncementTemplateKey(
  value: string | null | undefined,
): value is CommunityAnnouncementTemplateKey {
  return COMMUNITY_ANNOUNCEMENT_TEMPLATES.some((template) => template.key === value);
}

export function getAnnouncementTemplate(
  key: CommunityAnnouncementTemplateKey | null | undefined,
) {
  return COMMUNITY_ANNOUNCEMENT_TEMPLATES.find((template) => template.key === key) ?? null;
}

export function getAnnouncementTopicId(
  key: CommunityAnnouncementTemplateKey | null | undefined,
): ChatTopicId | null {
  return getAnnouncementTemplate(key)?.topicId ?? null;
}

export function isCommunityAnnouncementTopicId(
  topicId: ChatTopicId | null | undefined,
): boolean {
  return COMMUNITY_ANNOUNCEMENT_TEMPLATES.some((template) => template.topicId === topicId);
}

export function buildAnnouncementDraft(
  key: CommunityAnnouncementTemplateKey | null | undefined,
): string {
  return getAnnouncementTemplate(key)?.draft ?? "";
}

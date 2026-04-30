export type ChatChannelType =
  | "community"
  | "dm"
  | "admin_elu"
  | "territory"
  | "bug_report";

export type ChatChannelAccessContext = {
  roleLabel: string | null | undefined;
  hasArrondissement: boolean;
};

export type ChatChannelDefinition = {
  type: ChatChannelType;
  label: string;
  description: string;
  requiresArrondissement?: boolean;
};

const CHAT_CHANNEL_DEFINITIONS: Record<ChatChannelType, ChatChannelDefinition> = {
  community: {
    type: "community",
    label: "Communauté globale",
    description: "Messages ouverts à tous les membres connectés.",
  },
  dm: {
    type: "dm",
    label: "Messages privés",
    description: "Conversation directe et confidentielle avec un membre.",
  },
  admin_elu: {
    type: "admin_elu",
    label: "Admin & élus",
    description: "Canal réservé aux élus, à l'administration et au propriétaire.",
  },
  territory: {
    type: "territory",
    label: "Arrondissements & limitrophes",
    description: "Échanges liés à votre arrondissement et à ses voisins.",
    requiresArrondissement: true,
  },
  bug_report: {
    type: "bug_report",
    label: "Feedback",
    description: "Signaler un bug, proposer une amélioration ou une collaboration.",
  },
};

export const CHAT_CHANNEL_ORDER: ChatChannelType[] = [
  "community",
  "dm",
  "admin_elu",
  "territory",
  "bug_report",
];

function normalizeRoleLabel(roleLabel: string | null | undefined): string | null {
  const normalized = (roleLabel ?? "").trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function isChatChannelType(value: string | null | undefined): value is ChatChannelType {
  return value !== null && value !== undefined && value in CHAT_CHANNEL_DEFINITIONS;
}

export function canAccessChatChannel(
  channelType: ChatChannelType,
  context: ChatChannelAccessContext,
): boolean {
  const roleLabel = normalizeRoleLabel(context.roleLabel);

  switch (channelType) {
    case "community":
    case "dm":
    case "bug_report":
      return true;
    case "admin_elu":
      return roleLabel === "admin" || roleLabel === "max" || roleLabel === "elu";
    case "territory":
      return context.hasArrondissement;
    default:
      return false;
  }
}

export function getVisibleChatChannelTypes(
  context: ChatChannelAccessContext,
): ChatChannelType[] {
  return CHAT_CHANNEL_ORDER.filter((channelType) =>
    canAccessChatChannel(channelType, context),
  );
}

export function getChatChannelDefinition(
  channelType: ChatChannelType,
): ChatChannelDefinition {
  return CHAT_CHANNEL_DEFINITIONS[channelType];
}

export function getDefaultChatChannelType(
  context: ChatChannelAccessContext,
): ChatChannelType {
  return (
    getVisibleChatChannelTypes(context)[0] ??
    "community"
  );
}

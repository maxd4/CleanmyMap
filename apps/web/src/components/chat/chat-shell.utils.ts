import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { Bug, Mail, MapPin, Shield, Users, type LucideIcon } from "lucide-react";
import type { useUser } from "@clerk/nextjs";
import {
  getChatChannelDefinition,
  type ChatChannelType,
} from "@/lib/chat/channels";
import {
  getDiscussionGuidance,
  type ChatTopicId,
} from "./discussion-guidance";

export type ChannelVisual = {
  icon: LucideIcon;
  accentClass: string;
  chipClass: string;
};

export const CHANNEL_VISUALS: Record<ChatChannelType, ChannelVisual> = {
  community: {
    icon: Users,
    accentClass: "text-emerald-500",
    chipClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  dm: {
    icon: Mail,
    accentClass: "text-sky-500",
    chipClass: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  },
  admin_elu: {
    icon: Shield,
    accentClass: "text-violet-500",
    chipClass: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  },
  territory: {
    icon: MapPin,
    accentClass: "text-amber-500",
    chipClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
  bug_report: {
    icon: Bug,
    accentClass: "text-rose-500",
    chipClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  },
};

export type ChatMetaItem = {
  label: string;
  value: string;
};

export function toMetadataRecord(
  value: unknown,
): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

export function readMetadataString(
  metadata: unknown,
  key: string,
): string | null {
  const record = toMetadataRecord(metadata);
  if (!record) {
    return null;
  }
  const value = record[key];
  return typeof value === "string" ? value.trim() : null;
}

export function parseArrondissement(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
    return null;
  }

  return parsed;
}

export function getClerkRoleLabel(user: ReturnType<typeof useUser>["user"]): string {
  const publicRole = readMetadataString(user?.publicMetadata, "role");
  return (publicRole ?? "benevole").toLowerCase();
}

export function getClerkArrondissement(user: ReturnType<typeof useUser>["user"]): number | null {
  const publicMetadata = toMetadataRecord(user?.publicMetadata);
  const publicArrondissement = parseArrondissement(
    publicMetadata?.parisArrondissement,
  );
  return publicArrondissement;
}

export function getChannelPlaceholder(channelType: ChatChannelType): string {
  switch (channelType) {
    case "community":
      return "Partagez une actualité, un besoin de relais associatif, un besoin de bénévoles ou un point d'avancement.";
    case "dm":
      return "Choisissez un destinataire puis rédigez votre message privé.";
    case "admin_elu":
      return "Partagez un point de pilotage ou une décision à trancher.";
    case "territory":
      return "Partagez une information liée à votre arrondissement ou à son voisinage.";
    case "bug_report":
      return "Ouvrez le panneau feedback pour signaler un bug, proposer une amélioration ou une collaboration.";
    default:
      return "Écrivez votre message ici.";
  }
}

export type ChatEmptyStateCopy = {
  title: string;
  cardSummary: string;
  description: string;
  starterTitle: string;
  starterPrompts: string[];
  purposeTags: string[];
  messagePattern: string;
  composerHint: string;
  visibilityLabel: string;
  audienceLabel: string;
  channelGoal: string;
};

export function getEmptyStateCopy(
  channelType: ChatChannelType,
  locale: "fr" | "en",
  recipientLabel?: string | null,
  territoryLabel?: string | null,
  topicId?: ChatTopicId | null,
): ChatEmptyStateCopy {
  const guidance = getDiscussionGuidance(channelType, {
    locale,
    recipientLabel,
    territoryLabel,
  }, topicId);

  return {
    title: guidance.emptyTitle,
    cardSummary: guidance.cardSummary,
    description: guidance.emptyDescription,
    starterTitle: guidance.starterTitle,
    starterPrompts: guidance.starterPrompts,
    purposeTags: guidance.purposeTags,
    messagePattern: guidance.messagePattern,
    composerHint: guidance.composerHint,
    visibilityLabel: guidance.visibilityLabel,
    audienceLabel: guidance.audienceLabel,
    channelGoal: guidance.channelGoal,
  };
}

export function getChannelTitle(channelType: ChatChannelType): string {
  return getChatChannelDefinition(channelType).label;
}

export function formatRecentActivityLabel(
  locale: "fr" | "en",
  lastMessageAt: string | null,
): string {
  if (!lastMessageAt) {
    return locale === "fr" ? "Aucun message pour l'instant" : "No message yet";
  }

  const distance = formatDistanceToNow(new Date(lastMessageAt), {
    addSuffix: true,
    locale: locale === "fr" ? fr : enUS,
  });
  return locale === "fr" ? `Dernier message ${distance}` : `Last message ${distance}`;
}

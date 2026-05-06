import {
  findDistrictByName,
  getNeighbors,
  getSuburbsForDistrict,
  isGreaterParisZone,
} from "@/lib/geo/paris-neighborhood";
import { getAffectedArrondissements } from "@/lib/geo/paris-arrondissements";

export type ChatChannelType =
  | "community"
  | "dm"
  | "admin_elu"
  | "territory"
  | "bug_report";

export type ZoneContext = {
  zoneName: string | null;
  arrondissementId: number | null;
};

export type ChatChannelAccessContext = {
  roleLabel: string | null | undefined;
  hasArrondissement: boolean;
  hasGreaterParisZone: boolean;
  zoneContext: ZoneContext | null;
};

export type ChatChannelDefinition = {
  type: ChatChannelType;
  label: string;
  description: string;
  requiresZone?: boolean;
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
    label: "Territoire & limitrophes",
    description: "Échanges liés à votre zone (arrondissement ou commune) et ses voisines.",
    requiresZone: true,
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
      return context.hasGreaterParisZone || context.hasArrondissement;
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

export function getTerritoryFilter(
  zoneContext: ZoneContext | null,
): { arrondissementIds: number[] | null; zoneNames: string[] | null } {
  if (!zoneContext) {
    return { arrondissementIds: null, zoneNames: null };
  }

  if (zoneContext.zoneName) {
    const district = findDistrictByName(zoneContext.zoneName);
    if (district) {
      return {
        arrondissementIds: getAffectedArrondissements(district.number),
        zoneNames: getSuburbsForDistrict(district.number),
      };
    }
  }

  if (zoneContext.zoneName && isGreaterParisZone(zoneContext.zoneName)) {
    const neighbors = getNeighbors(zoneContext.zoneName);
    return {
      arrondissementIds: null,
      zoneNames: [zoneContext.zoneName, ...neighbors],
    };
  }

  if (zoneContext.arrondissementId && zoneContext.arrondissementId >= 1 && zoneContext.arrondissementId <= 20) {
    const neighboringSuburbs = getSuburbsForDistrict(zoneContext.arrondissementId);
    return {
      arrondissementIds: getAffectedArrondissements(zoneContext.arrondissementId),
      zoneNames: neighboringSuburbs.length > 0 ? neighboringSuburbs : null,
    };
  }

  return { arrondissementIds: null, zoneNames: null };
}

export function buildChannelAccessHint(channelType: ChatChannelType): string {
  switch (channelType) {
    case "community":
      return "Canal communautaire indisponible pour le moment.";
    case "dm":
      return "Sélectionnez un destinataire pour ouvrir les messages privés.";
    case "admin_elu":
      return "Canal réservé aux élus et à l'administration.";
    case "territory":
      return "Votre profil doit avoir une zone (arrondissement ou commune) pour ouvrir ce canal.";
    case "bug_report":
      return "Le canal de feedback est indisponible tant qu'aucun compte administrateur n'est configuré.";
    default:
      return "Canal indisponible.";
  }
}

export function getZoneLabel(zoneContext: ZoneContext | null): string {
  if (!zoneContext) {
    return "Aucune zone définie";
  }
  if (zoneContext.zoneName) {
    return zoneContext.zoneName;
  }
  if (zoneContext.arrondissementId) {
    return `${zoneContext.arrondissementId}e arrondissement`;
  }
  return "Aucune zone définie";
}

export function extractZoneContextFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): ZoneContext {
  const zoneNameRaw = metadata?.["zoneName"];
  const zoneName = typeof zoneNameRaw === "string" && zoneNameRaw.length > 0 ? zoneNameRaw : null;

  const arrondissementRaw = metadata?.["parisArrondissement"];
  let arrondissementId: number | null = null;
  if (typeof arrondissementRaw === "number" && arrondissementRaw >= 1 && arrondissementRaw <= 20) {
    arrondissementId = arrondissementRaw;
  } else if (typeof arrondissementRaw === "string") {
    const parsed = parseInt(arrondissementRaw, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 20) {
      arrondissementId = parsed;
    }
  }

  return { zoneName, arrondissementId };
}

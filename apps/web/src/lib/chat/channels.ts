import {
  findDistrictByName,
  getNeighbors,
  getSuburbsForDistrict,
  isGreaterParisZone,
} from "@/lib/geo/paris-neighborhood";
import {
  getAffectedArrondissements,
  isParisArrondissementLabel,
} from "@/lib/geo/paris-arrondissements";

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

function buildDistrictTerritoryFilter(districtNumber: number): {
  arrondissementIds: number[] | null;
  zoneNames: string[] | null;
} {
  return {
    arrondissementIds: getAffectedArrondissements(districtNumber),
    zoneNames: getSuburbsForDistrict(districtNumber),
  };
}

function buildGreaterParisTerritoryFilter(zoneName: string): {
  arrondissementIds: number[] | null;
  zoneNames: string[] | null;
} {
  return {
    arrondissementIds: null,
    zoneNames: [zoneName, ...getNeighbors(zoneName)],
  };
}

function buildArrondissementTerritoryFilter(arrondissementId: number): {
  arrondissementIds: number[] | null;
  zoneNames: string[] | null;
} {
  const neighboringSuburbs = getSuburbsForDistrict(arrondissementId);
  return {
    arrondissementIds: getAffectedArrondissements(arrondissementId),
    zoneNames: neighboringSuburbs.length > 0 ? neighboringSuburbs : null,
  };
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
      return buildDistrictTerritoryFilter(district.number);
    }
    if (isGreaterParisZone(zoneContext.zoneName)) {
      return buildGreaterParisTerritoryFilter(zoneContext.zoneName);
    }
  }

  if (zoneContext.arrondissementId) {
    const zoneIsParis = zoneContext.zoneName ? isParisArrondissementLabel(zoneContext.zoneName) : false;
    if (
      zoneContext.arrondissementId >= 1 &&
      zoneContext.arrondissementId <= 20 &&
      (zoneIsParis || !zoneContext.zoneName)
    ) {
      return buildArrondissementTerritoryFilter(zoneContext.arrondissementId);
    }
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

function readZoneName(metadata: Record<string, unknown> | null | undefined): string | null {
  const zoneNameRaw = metadata?.["territoryLabel"] ?? metadata?.["zoneName"];
  return typeof zoneNameRaw === "string" && zoneNameRaw.length > 0 ? zoneNameRaw : null;
}

function readArrondissementCandidate(
  metadata: Record<string, unknown> | null | undefined,
): unknown {
  return metadata?.["territoryArrondissement"] ?? metadata?.["parisArrondissement"] ?? null;
}

function resolveDirectArrondissementId(
  arrondissementRaw: unknown,
  canUseArrondissement: boolean,
): number | null {
  if (!canUseArrondissement) {
    return null;
  }

  if (typeof arrondissementRaw === "number") {
    return arrondissementRaw >= 1 && arrondissementRaw <= 20 ? arrondissementRaw : null;
  }

  if (typeof arrondissementRaw === "string") {
    const parsed = Number.parseInt(arrondissementRaw, 10);
    return Number.isFinite(parsed) && parsed >= 1 && parsed <= 20 ? parsed : null;
  }

  return null;
}

function resolveArrondissementFromParisLabel(zoneName: string): number | null {
  const district = findDistrictByName(zoneName);
  return district ? district.number : null;
}

export function extractZoneContextFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): ZoneContext {
  const zoneName = readZoneName(metadata);
  const arrondissementRaw = readArrondissementCandidate(metadata);
  const zoneIsParis = zoneName ? isParisArrondissementLabel(zoneName) : false;
  const arrondissementId = resolveDirectArrondissementId(
    arrondissementRaw,
    zoneIsParis || zoneName === null,
  );

  if (arrondissementId !== null) {
    return { zoneName, arrondissementId };
  }

  if (zoneName && zoneIsParis) {
    return { zoneName, arrondissementId: resolveArrondissementFromParisLabel(zoneName) };
  }

  return { zoneName, arrondissementId: null };
}

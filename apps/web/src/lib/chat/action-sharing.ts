import { extractArrondissementFromLabel } from "@/lib/geo/paris-arrondissements";
import { extractEventRefFromNotes } from "@/lib/actions/event-link";
import { toActionContract } from "@/lib/actions/unified-source/contracts";
import { isPublishedFuturePreAction } from "@/lib/actions/temporal";
import type { ActionRow } from "@/types/database";
import {
  extractZoneContextFromMetadata,
  type ZoneContext,
} from "@/lib/chat/channels";
import { findZoneWithNeighbors } from "@/lib/geo/paris-neighborhood";

export const SHARE_DESTINATION_CHANNELS = ["community", "territory", "dm"] as const;
export type ShareDestinationChannel = (typeof SHARE_DESTINATION_CHANNELS)[number];

export type ShareDestination = {
  id: string;
  channelType: ShareDestinationChannel;
  label: string;
  description: string;
  recipientId?: string;
  zoneName?: string | null;
  arrondissementId?: number | null;
};

export type ShareProfile = {
  id: string;
  display_name: string | null;
  handle: string | null;
  paris_arrondissement: number | null;
  role_label: string | null;
  metadata: Record<string, unknown> | null;
};

export type PublicActionReference = {
  id: string;
  shareKind: PublicActionShareKind;
  title: string;
  actionDate: string;
  eventStartTime: string | null;
  eventEndTime: string | null;
  locationLabel: string;
  organizerLabel: string;
  participantsExpected: number;
  durationMinutes: number;
  objective: string | null;
  route: {
    kind: "point" | "polyline" | "polygon";
    geojson: string;
  } | null;
  groupJoinEnabled: boolean;
  event: {
    id: string;
    title: string;
    eventDate: string;
    locationLabel: string;
  } | null;
};

export type PublicActionShareKind = "invitation" | "result";

export type PublicActionEvent = NonNullable<PublicActionReference["event"]>;

export function isShareableFutureAction(
  action: Pick<
    ActionRow,
    | "action_date"
    | "event_start_time"
    | "action_phase"
    | "status"
    | "moderation_visibility"
    | "published_at"
  >,
  now = new Date(),
): boolean {
  return getPublicActionShareKind(action, now) === "invitation";
}

export function getPublicActionShareKind(
  action: Pick<
    ActionRow,
    | "action_date"
    | "event_start_time"
    | "action_phase"
    | "status"
    | "moderation_visibility"
    | "published_at"
  >,
  now = new Date(),
): PublicActionShareKind | null {
  if (!action.published_at || action.moderation_visibility === "hidden") {
    return null;
  }

  if (isPublishedFuturePreAction(action, now)) {
    return "invitation";
  }

  return action.action_phase === "post_action_complete" && action.status === "approved"
    ? "result"
    : null;
}

export function isPublicActionReferenceAvailable(
  action: Pick<
    ActionRow,
    | "action_date"
    | "event_start_time"
    | "action_phase"
    | "status"
    | "moderation_visibility"
    | "published_at"
  >,
  now = new Date(),
): boolean {
  return getPublicActionShareKind(action, now) !== null;
}

function finiteCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : 0;
}

function objectiveLabel(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const labels: Record<string, string> = {
    repérage: "Repérage",
    nettoyage: "Nettoyage",
    "collecte_mégots": "Collecte de mégots",
    action_mixte: "Action mixte",
    sensibilisation: "Sensibilisation",
    autre: "Autre",
  };
  return labels[value] ?? value;
}

export function buildPublicActionReference(
  row: ActionRow,
  event: PublicActionEvent | null = null,
): PublicActionReference {
  const contract = toActionContract(row);
  const preparation = contract.metadata.preparationData;
  const routeGeoJson = contract.geometry.geojson;
  const route = routeGeoJson && contract.geometry.kind
    ? { kind: contract.geometry.kind, geojson: routeGeoJson }
    : null;

  return {
    id: row.id,
    shareKind:
      getPublicActionShareKind(row) ??
      (row.action_phase === "pre_action" ? "invitation" : "result"),
    title: preparation?.actionTitle?.trim() || row.location_label,
    actionDate: row.action_date,
    eventStartTime: row.event_start_time ?? null,
    eventEndTime: row.event_end_time ?? null,
    locationLabel: row.location_label,
    organizerLabel:
      contract.metadata.associationName?.trim() ||
      contract.metadata.actorName?.trim() ||
      "Organisateur",
    participantsExpected: finiteCount(
      preparation?.volunteerParticipation?.participantsCount ??
        contract.metadata.volunteersCount,
    ),
    durationMinutes: finiteCount(contract.metadata.durationMinutes),
    objective: objectiveLabel(preparation?.plannedObjective),
    route,
    groupJoinEnabled:
      contract.metadata.groupJoinEnabled === true || preparation?.groupJoinEnabled === true,
    event,
  };
}

export function resolveShareTerritoryDestination(
  profile: Pick<ShareProfile, "paris_arrondissement" | "metadata"> | null,
): Pick<ShareDestination, "zoneName" | "arrondissementId"> | null {
  const metadataZone: ZoneContext = extractZoneContextFromMetadata(profile?.metadata ?? null);
  const zoneName = metadataZone.zoneName;
  const inferredArrondissement = zoneName
    ? extractArrondissementFromLabel(zoneName)
    : null;
  const arrondissementId =
    profile?.paris_arrondissement ?? metadataZone.arrondissementId ?? inferredArrondissement;

  if (zoneName && findZoneWithNeighbors(zoneName)) {
    return { zoneName, arrondissementId };
  }

  if (arrondissementId && arrondissementId >= 1 && arrondissementId <= 20) {
    return { zoneName: `${arrondissementId}e arrondissement`, arrondissementId };
  }

  return null;
}

export function buildShareDestinationList(params: {
  profile: ShareProfile | null;
  dmRows: Array<{
    peer_id: string;
    peer_display_name: string | null;
    peer_handle: string | null;
  }>;
  includeTerritory?: boolean;
}): ShareDestination[] {
  const destinations: ShareDestination[] = [
    {
      id: "community",
      channelType: "community",
      label: "Communauté globale",
      description: "Conversation existante de la communauté",
    },
  ];
  const territory = resolveShareTerritoryDestination(params.profile);
  if (territory && params.includeTerritory !== false) {
    destinations.push({
      id: "territory",
      channelType: "territory",
      label: territory.zoneName ?? "Mon territoire",
      description: "Conversation territoriale existante",
      ...territory,
    });
  }

  for (const row of params.dmRows) {
    const recipientId = row.peer_id?.trim();
    if (!recipientId) continue;
    destinations.push({
      id: `dm:${recipientId}`,
      channelType: "dm",
      recipientId,
      label: row.peer_display_name?.trim() || row.peer_handle?.trim() || "Membre",
      description: "Conversation privée existante",
    });
  }

  return destinations;
}

export function eventReferenceFromAction(row: Pick<ActionRow, "notes">): string | null {
  return extractEventRefFromNotes(row.notes);
}

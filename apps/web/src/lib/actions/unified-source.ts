import type { SupabaseClient } from "@supabase/supabase-js";
import { parseDrawingFromNotes, toGeoJsonString } from "@/lib/actions/drawing";
import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import {
  ACTION_ENTITY_TYPES,
  buildActionDataContract,
} from "@/lib/actions/data-contract";
import type {
  ActionDataContract,
  ActionEntityType,
} from "@/lib/actions/data-contract";
import { fetchActions, type StoredAction } from "@/lib/actions/store";
import type { ActionStatus } from "@/lib/actions/types";
import { loadLocalActionContracts } from "@/lib/data/map-records";

type UnifiedActionContractsParams = {
  limit: number;
  status: ActionStatus | null;
  floorDate: string | null;
  requireCoordinates: boolean;
  types: ActionEntityType[] | null;
};

type UnifiedSourceName = "actions" | "spots" | "local";

export type UnifiedSourceHealth = {
  partial: boolean;
  failedSources: UnifiedSourceName[];
  availableSources: UnifiedSourceName[];
  warnings: string[];
};

type SpotRow = {
  id: string;
  created_at: string;
  created_by_clerk_id?: string | null;
  label: string;
  waste_type: string | null;
  latitude: number | null;
  longitude: number | null;
  status: "new" | "validated" | "cleaned";
  notes: string | null;
};

function toActionContractFromRow(row: StoredAction): ActionDataContract {
  const parsedNotes = parseDrawingFromNotes(row.notes);
  const parsedMetadata = extractActionMetadataFromNotes(parsedNotes.cleanNotes);
  return buildActionDataContract({
    id: row.id,
    type: "action",
    status: row.status,
    source: "actions",
    createdByClerkId: row.created_by_clerk_id,
    observedAt: row.action_date,
    createdAt: row.created_at,
    locationLabel: row.location_label,
    latitude: row.latitude,
    longitude: row.longitude,
    wasteKg: row.waste_kg,
    cigaretteButts: row.cigarette_butts,
    volunteersCount: row.volunteers_count,
    durationMinutes: row.duration_minutes,
    actorName: row.actor_name,
    associationName: parsedMetadata.associationName,
    placeType: parsedMetadata.placeType,
    departureLocationLabel: parsedMetadata.departureLocationLabel,
    arrivalLocationLabel: parsedMetadata.arrivalLocationLabel,
    routeStyle: parsedMetadata.routeStyle,
    routeAdjustmentMessage: parsedMetadata.routeAdjustmentMessage,
    notes: parsedMetadata.cleanNotes,
    notesPlain: parsedMetadata.cleanNotes,
    submissionMode: parsedMetadata.submissionMode,
    wasteBreakdown: parsedMetadata.wasteBreakdown,
    manualDrawing: parsedNotes.manualDrawing,
    manualDrawingGeoJson: toGeoJsonString(parsedNotes.manualDrawing),
  });
}

function mapSpotStatusToActionStatus(status: SpotRow["status"]): ActionStatus {
  if (status === "validated" || status === "cleaned") {
    return "approved";
  }
  return "pending";
}

function mapActionStatusToSpotStatuses(
  status: ActionStatus | null,
): SpotRow["status"][] | null {
  if (!status) {
    return null;
  }
  if (status === "pending") {
    return ["new"];
  }
  if (status === "approved") {
    return ["validated", "cleaned"];
  }
  return [];
}

function mapSpotWasteTypeToEntityType(
  wasteType: string | null,
): ActionEntityType {
  if ((wasteType ?? "").trim().toLowerCase() === "spot") {
    return "spot";
  }
  return "clean_place";
}

function toSpotContractFromRow(row: SpotRow): ActionDataContract {
  return buildActionDataContract({
    id: row.id,
    type: mapSpotWasteTypeToEntityType(row.waste_type),
    status: mapSpotStatusToActionStatus(row.status),
    source: "spots",
    createdByClerkId: row.created_by_clerk_id,
    observedAt: row.created_at,
    createdAt: row.created_at,
    locationLabel: row.label,
    latitude: row.latitude,
    longitude: row.longitude,
    notes: row.notes,
  });
}

function dedupeContracts(
  contracts: ActionDataContract[],
): ActionDataContract[] {
  const output: ActionDataContract[] = [];
  const seen = new Set<string>();
  for (const contract of contracts) {
    const key = `${contract.id}::${contract.type}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(contract);
  }
  return output;
}

function filterByTypes(
  contracts: ActionDataContract[],
  types: ActionEntityType[] | null,
): ActionDataContract[] {
  if (!types || types.length === 0) {
    return contracts;
  }
  const allowed = new Set(types);
  return contracts.filter((contract) => allowed.has(contract.type));
}

const TEST_MARKERS = [
  "seed de test",
  "anonymized test seed",
  "runtime_seed",
  "quartier demo",
  "zone test",
  "lieu test",
  "test_seed",
] as const;

function isTestLikeContract(contract: ActionDataContract): boolean {
  const haystack = [
    contract.id,
    contract.source,
    contract.location.label,
    contract.metadata.notes ?? "",
    contract.metadata.notesPlain ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return TEST_MARKERS.some((marker) => haystack.includes(marker));
}

export function parseEntityTypesParam(
  raw: string | null,
): ActionEntityType[] | null {
  if (!raw || raw.trim() === "" || raw === "all") {
    return null;
  }
  const tokens = raw
    .split(",")
    .map((token) => token.trim())
    .filter((token): token is ActionEntityType =>
      ACTION_ENTITY_TYPES.includes(token as ActionEntityType),
    );
  if (tokens.length === 0) {
    return null;
  }
  return [...new Set(tokens)];
}

export async function fetchUnifiedActionContracts(
  supabase: SupabaseClient,
  params: UnifiedActionContractsParams,
): Promise<{
  items: ActionDataContract[];
  isTruncated: boolean;
  sourceHealth: UnifiedSourceHealth;
}> {
  const [remoteRowsResult, remoteSpotsResult, localContracts] =
    await Promise.allSettled([
      fetchActions(supabase, {
        limit: params.limit + 1, // On demande un de plus pour détecter la troncature
        status: params.status,
        floorDate: params.floorDate ?? undefined,
        requireCoordinates: params.requireCoordinates,
      }),
      (async () => {
        const spotStatuses = mapActionStatusToSpotStatuses(params.status);
        if (spotStatuses && spotStatuses.length === 0) {
          return [] as SpotRow[];
        }

        let query = supabase
          .from("spots")
          .select(
            "id, created_at, label, waste_type, latitude, longitude, status, notes",
          )
          .order("created_at", { ascending: false })
          .limit(params.limit + 1); // Un de plus ici aussi

        if (params.floorDate) {
          query = query.gte("created_at", `${params.floorDate}T00:00:00.000Z`);
        }
        if (params.requireCoordinates) {
          query = query
            .not("latitude", "is", null)
            .not("longitude", "is", null);
        }
        if (spotStatuses) {
          query = query.in("status", spotStatuses);
        }

        const result = await query;
        if (result.error) {
          throw result.error;
        }
        return (result.data ?? []) as SpotRow[];
      })(),
      loadLocalActionContracts({
        status: params.status,
        floorDate: params.floorDate,
        limit: params.limit + 1, // Et ici
        requireCoordinates: params.requireCoordinates,
      }),
    ]);

  const failedSources: UnifiedSourceName[] = [];
  const availableSources: UnifiedSourceName[] = [];

  if (remoteRowsResult.status === "rejected") {
    failedSources.push("actions");
    console.error("Unified source warning: actions fetch failed", {
      message:
        remoteRowsResult.reason instanceof Error
          ? remoteRowsResult.reason.message
          : String(remoteRowsResult.reason),
    });
  } else {
    availableSources.push("actions");
  }

  if (remoteSpotsResult.status === "rejected") {
    failedSources.push("spots");
    console.error("Unified source warning: spots fetch failed", {
      message:
        remoteSpotsResult.reason instanceof Error
          ? remoteSpotsResult.reason.message
          : String(remoteSpotsResult.reason),
    });
  } else {
    availableSources.push("spots");
  }

  const remoteRows =
    remoteRowsResult.status === "fulfilled" ? remoteRowsResult.value : [];
  const remoteSpots =
    remoteSpotsResult.status === "fulfilled" ? remoteSpotsResult.value : [];
  const resolvedLocalContracts =
    localContracts.status === "fulfilled" ? localContracts.value : [];

  if (localContracts.status === "rejected") {
    throw localContracts.reason;
  }
  availableSources.push("local");

  const remoteActionContracts = remoteRows.map((row) =>
    toActionContractFromRow(row),
  );
  const remoteSpotContracts = remoteSpots.map((row) =>
    toSpotContractFromRow(row),
  );

  const rawContracts = filterByTypes(
    dedupeContracts([
      ...remoteActionContracts,
      ...remoteSpotContracts,
      ...resolvedLocalContracts,
    ]),
    params.types,
  ).filter((contract) => !isTestLikeContract(contract));

  // Détection de la troncature : si on a trouvé plus d'éléments que la limite demandée
  // avant le slice final.
  const isTruncated = rawContracts.length > params.limit;

  const items = rawContracts
    .sort((a, b) => b.dates.observedAt.localeCompare(a.dates.observedAt))
    .slice(0, params.limit);

  const sourceHealth: UnifiedSourceHealth = {
    partial: failedSources.length > 0,
    failedSources,
    availableSources,
    warnings:
      failedSources.length > 0
        ? [
            `Partial data: source(s) unavailable (${failedSources.join(", ")}).`,
          ]
        : [],
  };

  return { items, isTruncated, sourceHealth };
}

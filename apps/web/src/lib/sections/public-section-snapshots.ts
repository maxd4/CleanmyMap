import { buildActionInsights } from "@/lib/actions/insights";
import {
  toPublicActionListItem,
  toPublicActionMapItem,
} from "@/lib/actions/data-contract";
import { fetchUnifiedActionContracts } from "@/lib/actions/unified-source";
import {
  isPublicMapContract,
  toPublicMapContract,
} from "@/lib/actions/map/map-route";
import { buildDateFloor } from "@/lib/reports/csv";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionDataContract } from "@/lib/actions/contracts/contract-model";
import type {
  PublicSectionActionItem,
  PublicSectionActionListResponse,
  PublicSectionInitialData,
  PublicSectionMapItem,
  PublicSectionMapResponse,
} from "./public-section-snapshot-contract";

const ACTIONS_LIMIT = 500;
const MAP_LIMIT = 300;
const MAP_DAYS = 365;

function projectActionItem(contract: ActionDataContract): PublicSectionActionItem {
  const item = toPublicActionListItem(contract, buildActionInsights(contract));
  return {
    id: item.id,
    created_at: item.created_at,
    actor_name: item.actor_name,
    location_label: item.location_label,
    source: item.source,
    action_date: item.action_date,
    waste_kg: item.waste_kg,
    cigarette_butts: item.cigarette_butts,
    volunteers_count: item.volunteers_count,
    duration_minutes: item.duration_minutes,
    geometry_kind: item.geometry_kind,
    ...(item.contract
      ? {
          contract: {
            geometry: {
              kind: item.contract.geometry.kind,
              coordinates: item.contract.geometry.coordinates,
            },
            metadata: {
              volunteerParticipation:
                item.contract.metadata.volunteerParticipation ?? null,
            },
          },
        }
      : {}),
  };
}

function projectMapItem(contract: ActionDataContract): PublicSectionMapItem | null {
  const item = toPublicActionMapItem(contract, buildActionInsights(contract));
  const geometryKind = item.contract?.geometry.kind ?? item.geometry_kind ?? null;
  if (!geometryKind) {
    return null;
  }

  return {
    id: item.id,
    location_label: item.location_label,
    geometry_kind: geometryKind,
    ...(item.contract
      ? { contract: { geometry: { kind: item.contract.geometry.kind } } }
      : {}),
  };
}

function buildListResponse(
  contracts: ActionDataContract[],
  sourceHealth: PublicSectionActionListResponse["sourceHealth"],
): PublicSectionActionListResponse {
  const items = contracts
    .filter((contract) => contract.type === "action")
    .map(projectActionItem);
  return {
    status: "ok",
    count: items.length,
    items,
    partialSource: sourceHealth?.partial,
    sourceHealth,
  };
}

function buildMapResponse(
  contracts: ActionDataContract[],
  sourceHealth: PublicSectionMapResponse["sourceHealth"],
): PublicSectionMapResponse {
  const items = contracts
    .map(projectMapItem)
    .filter((item): item is PublicSectionMapItem => item !== null);
  return {
    status: "ok",
    count: items.length,
    daysWindow: MAP_DAYS,
    items,
    partialSource: sourceHealth?.partial,
    sourceHealth,
  };
}

export async function loadPublicSectionInitialData(
  sectionId: string,
): Promise<PublicSectionInitialData | undefined> {
  if (sectionId !== "recycling" && sectionId !== "climate" && sectionId !== "actors") {
    return undefined;
  }

  try {
    const supabase = getSupabaseServerClient();
    const now = new Date();
    const [actionsResult, mapResult] = await Promise.all([
      fetchUnifiedActionContracts(supabase, {
        limit: ACTIONS_LIMIT,
        status: "approved",
        floorDate: null,
        requireCoordinates: false,
        types: ["action"],
      }),
      fetchUnifiedActionContracts(supabase, {
        limit: MAP_LIMIT,
        status: "approved",
        includeFuturePublicActions: true,
        floorDate: buildDateFloor(MAP_DAYS),
        requireCoordinates: true,
        types: null,
      }),
    ]);

    const actions = buildListResponse(
      actionsResult.items,
      actionsResult.sourceHealth,
    );
    const mapContracts = mapResult.items
      .filter((contract) => isPublicMapContract(contract, now))
      .map((contract) => toPublicMapContract(contract, now));
    const map = buildMapResponse(mapContracts, mapResult.sourceHealth);

    if (sectionId === "climate") {
      return { climate: { actions } };
    }

    if (sectionId === "actors") {
      return { actors: { actions, map } };
    }

    return {
      recycling: {
        actions,
        map,
        // The breakdown endpoint intentionally remains authenticated. Its
        // absence is represented as null, never as fabricated zeroes.
        breakdown: null,
      },
    };
  } catch {
    // SSR must remain useful without turning a transient public-data outage
    // into a route failure. The client SWR fetcher remains the revalidation path.
    return undefined;
  }
}

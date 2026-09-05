import { buildTrashSpotterActionableCandidates } from "@/lib/actions/trash-spotter-actionable-candidates";
import { loadParisPressureSnapshot } from "@/lib/geo/paris-pressure-loader";
import { applyParisPressureToCandidates } from "@/lib/route/paris-pressure-route-adapter";
import {
  defaultRouteRecommendationFloorDate,
  loadCachedEventPressureByArrondissement,
} from "@/lib/route/recommendation-assistant";
import { resolveRouteDataStatus } from "@/lib/route/route-data-status";
import { loadRouteRecommendationSource } from "@/lib/route/route-recommendation-loader";
import { buildTrashSpotterRouteCandidates } from "@/lib/route/trash-spotter-recommendation";
import { loadCachedRouteEventSignalContext } from "@/lib/route/route-event-pressure-loader";
import type { RouteEventSignalContext } from "@/lib/route/route-event-pressure";
import type { SupabaseClient } from "@supabase/supabase-js";

export const EMPTY_EVENT_PRESSURE_CONTEXT = {
  pressureByArrondissement: new Map<number, number>(),
  eventSignals: [],
};

export const EMPTY_ROUTE_EVENT_SIGNAL_CONTEXT: RouteEventSignalContext = {
  candidatePressureById: new Map(),
  completedEventsConsidered: 0,
  geolocatedCompletedEvents: 0,
  eventsWithoutCoordinates: 0,
  futureEventSignals: [],
  sourceAvailable: false,
  warnings: ["Le signal événementiel est indisponible pour ce calcul."],
};

export type RouteEventPressureContext = Awaited<
  ReturnType<typeof loadCachedEventPressureByArrondissement>
>;

export type RouteCandidateData = Awaited<
  ReturnType<typeof loadRouteCandidateData>
>;

export async function loadRouteEventPressure(
  supabase: SupabaseClient,
): Promise<RouteEventPressureContext> {
  try {
    return await loadCachedEventPressureByArrondissement(() => supabase);
  } catch (eventPressureError: unknown) {
    console.warn(
      "Route recommendation event pressure unavailable; continuing without it",
      {
        message:
          eventPressureError instanceof Error
            ? eventPressureError.message
            : String(eventPressureError),
      },
    );
    return EMPTY_EVENT_PRESSURE_CONTEXT;
  }
}

export async function loadRouteCandidateData(
  supabase: SupabaseClient,
): Promise<{
  contracts: Awaited<ReturnType<typeof loadRouteRecommendationSource>>["items"];
  isTruncated: boolean;
  sourceHealth: Awaited<
    ReturnType<typeof loadRouteRecommendationSource>
  >["sourceHealth"];
  candidates: ReturnType<typeof buildTrashSpotterRouteCandidates>;
  spatialCandidates: ReturnType<typeof buildTrashSpotterRouteCandidates>;
  actionableCandidates: ReturnType<typeof buildTrashSpotterActionableCandidates>;
  parisPressureSnapshot: ReturnType<typeof loadParisPressureSnapshot>;
  dataStatus: ReturnType<typeof resolveRouteDataStatus>;
  routeEventSignalContext: RouteEventSignalContext;
}> {
  const { items: contracts, isTruncated, sourceHealth } =
    await loadRouteRecommendationSource(supabase, {
      limit: 600,
      floorDate: defaultRouteRecommendationFloorDate(),
    });

  const actionableCandidates = buildTrashSpotterActionableCandidates(contracts);
  const routeEventSignalContext = await loadCachedRouteEventSignalContext(
    () => supabase,
    actionableCandidates,
  ).catch((eventSignalError: unknown) => {
    console.warn(
      "Route recommendation event signal unavailable; continuing without it",
      {
        message: eventSignalError instanceof Error ? eventSignalError.message : String(eventSignalError),
      },
    );
    return EMPTY_ROUTE_EVENT_SIGNAL_CONTEXT;
  });
  const candidates = buildTrashSpotterRouteCandidates(
    actionableCandidates,
    new Date(),
    routeEventSignalContext.candidatePressureById,
  );
  const parisPressureSnapshot = loadParisPressureSnapshot();
  const spatialCandidates = parisPressureSnapshot
    ? applyParisPressureToCandidates(candidates, parisPressureSnapshot)
    : candidates;
  const dataStatus = resolveRouteDataStatus({
    candidateCount: candidates.length,
    isTruncated,
    sourceHealth,
  });

  return {
    contracts,
    isTruncated,
    sourceHealth,
    candidates,
    spatialCandidates,
    actionableCandidates,
    parisPressureSnapshot,
    dataStatus,
    routeEventSignalContext,
  };
}

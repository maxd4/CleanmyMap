import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity, requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadActionById } from "@/lib/actions/store";
import { canManageAction } from "@/lib/actions/permissions";
import { loadActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { isPublishedFuturePreAction } from "@/lib/actions/temporal";
import { buildPersistedGeometry } from "@/lib/actions/geometry/derived-geometry";
import {
  buildActionRouteVersionCalculation,
  buildActionRouteVersioning,
  isActionRouteVersioning,
  type ActionRouteVersioning,
} from "@/lib/route/route-active-version";
import { hashRoutePlannerSnapshot } from "@/lib/route/route-planner-snapshot-hash";
import { verifyRoutePlannerProof } from "@/lib/route/route-planner-proof";
import { isRoutePlannerProofShape } from "@/lib/route/route-planner-proof-contract";
import { isRoutePlannerSnapshot } from "@/lib/route/route-planner-snapshot-validation";
import { isOperationalRoute, type OperationalRoute } from "@/lib/route/route-operational";
import type { RoutePlannerSnapshot } from "@/lib/route/route-calibration-types";
import { loadActionParticipantSummaries } from "@/lib/actions/participation/participant-summaries";
import { loadRouteFreshnessSignal } from "@/lib/route/route-refresh-signals-loader";
import {
  assessRouteWeatherRefreshSignal,
  buildRouteRefreshSignals,
} from "@/lib/route/route-refresh-signals";

export const runtime = "nodejs";
// Justification Vercel: route version reads and writes depend on the authenticated user and fresh action state.
export const dynamic = "force-dynamic";

const routeVersionApplySchema = z
  .object({
    operationalRoute: z.custom<OperationalRoute>(isOperationalRoute, "Parcours opérationnel invalide."),
    plannerSnapshot: z.custom<RoutePlannerSnapshot>(isRoutePlannerSnapshot, "Snapshot planner invalide."),
    plannerProof: z.custom(isRoutePlannerProofShape, "Preuve planner invalide."),
  })
  .strict();

function conflict(message: string) {
  return NextResponse.json({ error: message, code: "state_conflict" }, { status: 409 });
}

function routeParametersMatchActiveVersion(
  current: ActionRouteVersioning["active"]["calculation"]["parameters"],
  next: RoutePlannerSnapshot["parameters"],
): boolean {
  return JSON.stringify({ ...current, origin: { ...current.origin, source: undefined } }) ===
    JSON.stringify({ ...next, origin: { ...next.origin, source: undefined } });
}

function operationalRouteMatchesSnapshot(
  operationalRoute: OperationalRoute,
  snapshot: RoutePlannerSnapshot,
): boolean {
  if (
    operationalRoute.plannerGroupCount !== snapshot.parameters.groupCount ||
    operationalRoute.routes.length !== snapshot.groups.length
  ) {
    return false;
  }
  const expected = new Map(
    snapshot.groups.map((group) => [group.groupIndex, JSON.stringify(group.routeGeometry)]),
  );
  return operationalRoute.routes.every(
    (route) => expected.get(route.groupIndex) === JSON.stringify(route.geometry),
  );
}

function initialVersioning(current: {
  preparation_data: {
    routeCalibrationContext?: { plannerSnapshot?: Parameters<typeof buildActionRouteVersioning>[0]["snapshot"] };
    operationalRoute?: Parameters<typeof buildActionRouteVersioning>[0]["operationalRoute"];
  } | null;
  created_by_clerk_id: string;
}): ActionRouteVersioning | null {
  const snapshot = current.preparation_data?.routeCalibrationContext?.plannerSnapshot;
  const operationalRoute = current.preparation_data?.operationalRoute;
  if (!snapshot || !operationalRoute) return null;
  return buildActionRouteVersioning({
    snapshot,
    operationalRoute,
    appliedAt: snapshot.generatedAt,
    appliedByUserId: current.created_by_clerk_id,
    snapshotHash: hashRoutePlannerSnapshot(snapshot),
  });
}

async function loadAuthorizedFutureAction(params: {
  supabase: ReturnType<typeof getSupabaseServerClient>;
  actionId: string;
  userId: string;
}): Promise<
  | { kind: "ok"; current: NonNullable<Awaited<ReturnType<typeof loadActionById>>>; supabase: typeof params.supabase }
  | { kind: "response"; response: Response }
> {
  const current = await loadActionById(params.supabase, params.actionId);
  if (!current) {
    return {
      kind: "response",
      response: NextResponse.json({ error: "Action introuvable." }, { status: 404 }),
    };
  }
  const identity = await getCurrentUserIdentity();
  const organizers = await loadActionOrganizerIdsForAction(
    params.supabase,
    params.actionId,
    current.created_by_clerk_id,
  );
  const canManage = canManageAction(
    identity
      ? { userId: params.userId, role: identity.role, activeRole: identity.activeRole }
      : null,
    { createdByClerkId: current.created_by_clerk_id, actionPhase: current.action_phase },
    organizers,
  );
  if (!canManage) {
    return {
      kind: "response",
      response: NextResponse.json(
        { error: "Vous n'êtes pas autorisé à actualiser l'itinéraire de cette action." },
        { status: 403 },
      ),
    };
  }
  if (!isPublishedFuturePreAction(current)) {
    return {
      kind: "response",
      response: conflict("Seule une action future publiée peut actualiser son itinéraire."),
    };
  }
  return { kind: "ok", current, supabase: params.supabase };
}

function validateRouteVersionProposal(params: {
  current: NonNullable<Awaited<ReturnType<typeof loadActionById>>>;
  proposal: z.infer<typeof routeVersionApplySchema>;
}): Response | { currentVersioning: ActionRouteVersioning; snapshotHash: string } {
  const preparationData = params.current.preparation_data ?? {};
  const currentVersioningValue = preparationData.routeVersioning;
  if (currentVersioningValue && !isActionRouteVersioning(currentVersioningValue)) {
    return conflict("La version active de l'itinéraire est incohérente.");
  }
  const currentVersioning =
    (currentVersioningValue as ActionRouteVersioning | undefined) ?? initialVersioning(params.current);
  if (!currentVersioning || !preparationData.operationalRoute) {
    return conflict("Cette action ne possède pas d'itinéraire actif exploitable.");
  }
  if (
    params.proposal.operationalRoute.routes.length === 0 ||
    !routeParametersMatchActiveVersion(
      currentVersioning.active.calculation.parameters,
      params.proposal.plannerSnapshot.parameters,
    ) ||
    !operationalRouteMatchesSnapshot(params.proposal.operationalRoute, params.proposal.plannerSnapshot)
  ) {
    return conflict("La proposition ne correspond pas aux paramètres de l'itinéraire actif.");
  }
  const verification = verifyRoutePlannerProof({
    proof: params.proposal.plannerProof,
    snapshot: params.proposal.plannerSnapshot,
  });
  if (!verification.ok) {
    return conflict("La proposition d'itinéraire n'est plus vérifiable.");
  }
  return { currentVersioning, snapshotHash: verification.snapshotHash };
}

function buildNextRouteVersioning(params: {
  current: NonNullable<Awaited<ReturnType<typeof loadActionById>>>;
  currentVersioning: ActionRouteVersioning;
  proposal: z.infer<typeof routeVersionApplySchema>;
  snapshotHash: string;
  appliedAt: string;
  appliedByUserId: string;
}): ActionRouteVersioning {
  const calculation = buildActionRouteVersionCalculation(params.proposal.plannerSnapshot, {
    snapshotHash: params.snapshotHash,
  });
  return {
    schemaVersion: params.currentVersioning.schemaVersion,
    active: buildActionRouteVersioning({
      snapshot: params.proposal.plannerSnapshot,
      operationalRoute: params.proposal.operationalRoute,
      appliedAt: params.appliedAt,
      appliedByUserId: params.appliedByUserId,
      snapshotHash: params.snapshotHash,
      calculation,
    }).active,
    history: [
      ...params.currentVersioning.history,
      {
        ...params.currentVersioning.active,
        operationalRoute: structuredClone(params.currentVersioning.active.operationalRoute),
      },
    ],
  };
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();

  const { actionId } = await ctx.params;
  const trimmedActionId = actionId.trim();
  if (!trimmedActionId) {
    return validationErrorResponse({ actionId: ["Identifiant d'action manquant."] });
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
  const parsed = routeVersionApplySchema.safeParse(rawPayload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

  try {
    const supabase = getSupabaseServerClient(true);
    const authorized = await loadAuthorizedFutureAction({
      supabase,
      actionId: trimmedActionId,
      userId: access.userId,
    });
    if (authorized.kind === "response") return authorized.response;
    const { current } = authorized;
    const validated = validateRouteVersionProposal({ current, proposal: parsed.data });
    if (validated instanceof Response) return validated;
    if (validated.currentVersioning.active.calculation.snapshotHash === validated.snapshotHash) {
      return NextResponse.json({
        status: "unchanged",
        actionId: trimmedActionId,
        activeRouteVersion: validated.currentVersioning.active,
        history: validated.currentVersioning.history,
      });
    }

    const appliedAt = new Date().toISOString();
    const nextVersioning = buildNextRouteVersioning({
      current,
      currentVersioning: validated.currentVersioning,
      proposal: parsed.data,
      snapshotHash: validated.snapshotHash,
      appliedAt,
      appliedByUserId: access.userId,
    });
    const preparationData = current.preparation_data ?? {};
    const persistedGeometry = buildPersistedGeometry({
      drawing: { kind: "polyline", coordinates: parsed.data.operationalRoute.routes[0]!.geometry.coordinates },
      geometrySourceHint: "routed",
      latitude: current.latitude,
      longitude: current.longitude,
      locationLabel: current.location_label,
      departureLocationLabel: preparationData.pointDeRendezVous,
      arrivalLocationLabel: preparationData.zoneCiblePrevue,
    });
    const updated = await supabase
      .from("actions")
      .update({
        preparation_data: {
          ...preparationData,
          operationalRoute: parsed.data.operationalRoute,
          routeVersioning: nextVersioning,
        },
        derived_geometry_kind: persistedGeometry.kind,
        derived_geometry_geojson: persistedGeometry.geojson,
        geometry_confidence: persistedGeometry.confidence,
        geometry_source: "routed",
      })
      .eq("id", trimmedActionId)
      .eq("published_at", current.published_at)
      .select("id")
      .maybeSingle();
    if (updated.error) throw updated.error;
    if (!updated.data) return conflict("L'action a changé avant l'application de l'itinéraire.");

    return NextResponse.json({
      status: "applied",
      actionId: trimmedActionId,
      activeRouteVersion: nextVersioning.active,
      history: nextVersioning.history,
    });
  } catch (error) {
    return handleApiError(error, "POST /api/actions/:actionId/route-version");
  }
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();

  const { actionId } = await ctx.params;
  const trimmedActionId = actionId.trim();
  if (!trimmedActionId) {
    return validationErrorResponse({ actionId: ["Identifiant d'action manquant."] });
  }

  try {
    const supabase = getSupabaseServerClient(true);
    const authorized = await loadAuthorizedFutureAction({
      supabase,
      actionId: trimmedActionId,
      userId: access.userId,
    });
    if (authorized.kind === "response") return authorized.response;

    const { current } = authorized;
    const preparationData = current.preparation_data ?? {};
    const currentVersioningValue = preparationData.routeVersioning;
    if (currentVersioningValue && !isActionRouteVersioning(currentVersioningValue)) {
      return conflict("La version active de l'itinéraire est incohérente.");
    }
    const versioning =
      (currentVersioningValue as ActionRouteVersioning | undefined) ?? initialVersioning(current);
    if (!versioning) {
      return conflict("Cette action ne possède pas d'itinéraire actif exploitable.");
    }

    const [summary] = await loadActionParticipantSummaries(supabase, {
      actionIds: [trimmedActionId],
      userId: access.userId,
    });
    const freshness = await loadRouteFreshnessSignal(supabase, versioning.active);
    const weather = assessRouteWeatherRefreshSignal({
      activeWeather:
        versioning.active.calculation.weatherContext ??
        preparationData.routeCalibrationContext?.plannerSnapshot?.weatherContext,
      operationalMinutes: versioning.active.calculation.metrics.totalMinutes,
    });
    const signals = buildRouteRefreshSignals({
      activeAppliedAt: versioning.active.appliedAt,
      calculation: versioning.active.calculation,
      confirmedParticipants: summary?.activeCount ?? null,
      freshness,
      weather,
    });

    return NextResponse.json({
      status: "ok",
      actionId: trimmedActionId,
      signals,
    });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/:actionId/route-version");
  }
}

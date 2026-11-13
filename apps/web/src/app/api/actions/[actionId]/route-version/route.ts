import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity, requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadActionById } from "@/lib/actions/store";
import { normalizeActionId } from "@/lib/actions/action-id";
import { canManageAction } from "@/lib/actions/permissions";
import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
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
import {
  operationalRouteMatchesPlannerSnapshot,
  resolvePersistedRouteGeometrySource,
} from "@/lib/route/route-provenance";
import type { RoutePlannerSnapshot } from "@/lib/route/route-calibration-types";
import {
  balancedVolunteerCounts,
  validateRouteGroupInput,
} from "@/lib/route/route-group-partition";
import type {
  RoutePlanningMode,
  RouteTerritorialGuidedGroup,
} from "@/lib/route/route-planning-mode";
import { loadActionParticipantSummaries } from "@/lib/actions/participation/participant-summaries";
import { loadRouteFreshnessSignal } from "@/lib/route/route-refresh-signals-loader";
import {
  assessRouteWeatherRefreshSignal,
  buildRouteRefreshSignals,
} from "@/lib/route/route-refresh-signals";
import { buildActionChangeEventKey } from "@/lib/actions/action-change-notifications";
import { emitActionUpdateNotifications } from "@/lib/actions/action-update-notifications";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function structurallyEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => structurallyEqual(value, right[index]));
  }
  if (!isRecord(left) || !isRecord(right)) return false;

  const leftKeys = Object.keys(left).filter((key) => left[key] !== undefined).sort();
  const rightKeys = Object.keys(right).filter((key) => right[key] !== undefined).sort();
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => key === rightKeys[index] &&
      structurallyEqual(left[key], right[key]));
}

function guidedModeStructure(mode: Extract<RoutePlanningMode, { type: "territorial-guided" }>) {
  return {
    type: mode.type,
    version: mode.version,
    groups: mode.groups.map((group) => {
      const structuralGroup: RouteTerritorialGuidedGroup = { ...group };
      delete structuralGroup.volunteerCount;
      return structuralGroup;
    }),
    budget: "budget" in mode ? mode.budget : undefined,
  };
}

function hasDeterministicGuidedVolunteerCounts(
  counts: readonly (number | undefined)[],
  volunteers: number,
  groupCount: number,
): boolean {
  let expectedCounts: number[];
  try {
    expectedCounts = balancedVolunteerCounts(volunteers, groupCount);
  } catch {
    return false;
  }
  return counts.length === groupCount && counts.every((count, index) =>
    Number.isInteger(count) && count === expectedCounts[index],
  ) && counts.reduce<number>((total, count) => total + (count ?? 0), 0) === volunteers;
}

function guidedVolunteerCountsChanged(
  currentCounts: readonly (number | undefined)[],
  nextCounts: readonly (number | undefined)[],
): boolean | null {
  const currentComplete = currentCounts.length > 0 && currentCounts.every((count) => count !== undefined);
  const nextComplete = nextCounts.length > 0 && nextCounts.every((count) => count !== undefined);
  if (currentComplete && nextComplete) {
    return currentCounts.some((count, index) => count !== nextCounts[index]);
  }
  if (currentCounts.every((count) => count === undefined) && nextCounts.every((count) => count === undefined)) {
    return false;
  }
  return null;
}

function guidedRouteParametersMatchActiveVersion(
  current: ActionRouteVersioning["active"]["calculation"]["parameters"],
  next: RoutePlannerSnapshot["parameters"],
  nextGuidedGroupCounts: readonly (number | undefined)[],
): boolean {
  const currentMode = current.planningMode;
  const nextMode = next.planningMode;
  if (currentMode.type !== "territorial-guided" || nextMode.type !== "territorial-guided") {
    return false;
  }
  if (
    current.groupCount !== next.groupCount ||
    currentMode.groups.length !== current.groupCount ||
    nextMode.groups.length !== next.groupCount ||
    !structurallyEqual(guidedModeStructure(currentMode), guidedModeStructure(nextMode))
  ) {
    return false;
  }

  if (!structurallyEqual({
    ...current,
    planningMode: undefined,
    volunteers: undefined,
    groupCount: undefined,
    origin: { ...current.origin, source: undefined },
  }, {
    ...next,
    planningMode: undefined,
    volunteers: undefined,
    groupCount: undefined,
    origin: { ...next.origin, source: undefined },
  })) {
    return false;
  }

  const nextModeCounts = nextMode.groups.map(({ volunteerCount }) => volunteerCount);
  const currentModeCounts = currentMode.groups.map(({ volunteerCount }) => volunteerCount);
  const hasAnyNextCount = nextGuidedGroupCounts.some((count) => count !== undefined);
  const hasCompleteNextCounts = nextGuidedGroupCounts.length > 0 && nextGuidedGroupCounts.every((count) => count !== undefined);
  const hasCompleteCurrentModeCounts = currentModeCounts.every((count) => count !== undefined);
  const hasCompleteNextModeCounts = nextModeCounts.every((count) => count !== undefined);
  if (currentMode.version === "route-territorial-guided-v2" &&
    (!hasCompleteCurrentModeCounts || !hasCompleteNextModeCounts)) {
    return false;
  }
  if (hasAnyNextCount && !hasCompleteNextCounts) return false;
  if (current.volunteers !== next.volunteers && !hasCompleteNextCounts) return false;
  return true;
}

function routeParametersMatchActiveVersion(
  current: ActionRouteVersioning["active"]["calculation"]["parameters"],
  next: RoutePlannerSnapshot["parameters"],
  confirmedParticipants: number | null,
  currentGuidedGroupCounts: readonly (number | undefined)[],
  nextGuidedGroupCounts: readonly (number | undefined)[],
): boolean {
  if (confirmedParticipants !== null && next.volunteers !== confirmedParticipants) {
    return false;
  }
  try {
    validateRouteGroupInput(next.volunteers, next.groupCount);
  } catch {
    return false;
  }
  if (current.planningMode.type === "territorial-guided" ||
    next.planningMode.type === "territorial-guided") {
    if (!guidedRouteParametersMatchActiveVersion(
      current,
      next,
      nextGuidedGroupCounts,
    )) return false;
    const guidedCountsChanged = guidedVolunteerCountsChanged(
      currentGuidedGroupCounts,
      nextGuidedGroupCounts,
    );
    if (guidedCountsChanged === null || (guidedCountsChanged && confirmedParticipants === null)) {
      return false;
    }
    const hasGuidedCountEvidence = currentGuidedGroupCounts.some((count) => count !== undefined) ||
      nextGuidedGroupCounts.some((count) => count !== undefined);
    if (!guidedCountsChanged && !hasGuidedCountEvidence && current.volunteers !== next.volunteers) {
      return false;
    }
    if (guidedCountsChanged && !hasDeterministicGuidedVolunteerCounts(
      nextGuidedGroupCounts,
      next.volunteers,
      next.groupCount,
    )) {
      return false;
    }
    return confirmedParticipants !== null || (
      current.volunteers === next.volunteers &&
      current.groupCount === next.groupCount
    );
  }
  return structurallyEqual({
    ...current,
    volunteers: undefined,
    groupCount: undefined,
    origin: { ...current.origin, source: undefined },
  }, {
    ...next,
    volunteers: undefined,
    groupCount: undefined,
    origin: { ...next.origin, source: undefined },
  }) && (confirmedParticipants !== null || (
    current.volunteers === next.volunteers && current.groupCount === next.groupCount
  ));
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
  const organizers = await loadCanonicalActionOrganizerIdsForAction(
    params.supabase,
    params.actionId,
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

async function loadRouteVersionAction(params: {
  actionId: string;
  userId: string;
}): Promise<
  | { kind: "ok"; current: NonNullable<Awaited<ReturnType<typeof loadActionById>>>; supabase: ReturnType<typeof getSupabaseServerClient> }
  | { kind: "response"; response: Response }
> {
  const supabase = getSupabaseServerClient(true);
  const authorized = await loadAuthorizedFutureAction({ ...params, supabase });
  if (authorized.kind === "response") return authorized;
  return { kind: "ok", current: authorized.current, supabase };
}

async function loadRouteVersionRequestContext(ctx: { params: Promise<{ actionId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();

  const { actionId } = await ctx.params;
  const trimmedActionId = normalizeActionId(actionId);
  if (!trimmedActionId) {
    return validationErrorResponse({ actionId: ["Identifiant d'action manquant."] });
  }

  return { access, trimmedActionId };
}

function validateRouteVersionProposal(params: {
  current: NonNullable<Awaited<ReturnType<typeof loadActionById>>>;
  proposal: z.infer<typeof routeVersionApplySchema>;
  confirmedParticipants: number | null;
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
  const currentMode = currentVersioning.active.calculation.parameters.planningMode;
  const nextMode = params.proposal.plannerSnapshot.parameters.planningMode;
  const currentGuidedGroupCounts = currentMode.type === "territorial-guided"
    ? currentMode.groups.map((group, index) =>
      group.volunteerCount ??
      currentVersioning.active.operationalRoute.routes.find((route) => route.groupIndex === index + 1)?.volunteerCount ??
      preparationData.routeCalibrationContext?.plannerSnapshot?.groups.find((group) => group.groupIndex === index + 1)?.volunteerCount,
    )
    : [];
  const nextGuidedGroupCounts = nextMode.type === "territorial-guided"
    ? nextMode.groups.map((group, index) =>
      group.volunteerCount ??
      params.proposal.plannerSnapshot.groups.find((snapshotGroup) => snapshotGroup.groupIndex === index + 1)?.volunteerCount ??
      params.proposal.operationalRoute.routes.find((route) => route.groupIndex === index + 1)?.volunteerCount,
    )
    : [];
  if (
    params.proposal.operationalRoute.routes.length === 0 ||
    !routeParametersMatchActiveVersion(
      currentVersioning.active.calculation.parameters,
      params.proposal.plannerSnapshot.parameters,
      params.confirmedParticipants,
      currentGuidedGroupCounts,
      nextGuidedGroupCounts,
    ) ||
    !operationalRouteMatchesPlannerSnapshot(params.proposal.operationalRoute, params.proposal.plannerSnapshot)
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

async function persistRouteVersionUpdate(params: {
  supabase: ReturnType<typeof getSupabaseServerClient>;
  actionId: string;
  currentPublishedAt: string;
  currentUpdatedAt: string;
  updateData: Record<string, unknown>;
  actorUserId: string;
}): Promise<Response | null> {
  const updated = await params.supabase
    .from("actions")
    .update(params.updateData)
    .eq("id", params.actionId)
    .eq("published_at", params.currentPublishedAt)
    .eq("updated_at", params.currentUpdatedAt)
    .select("id")
    .maybeSingle();
  if (updated.error) throw updated.error;
  if (!updated.data) return conflict("L'action a changé avant l'application de l'itinéraire.");

  await emitActionUpdateNotifications({
    supabase: params.supabase,
    actionId: params.actionId,
    actorUserId: params.actorUserId,
    changeKinds: ["route"],
    eventKey: buildActionChangeEventKey({
      actionId: params.actionId,
      revision: params.currentUpdatedAt,
      changeKinds: ["route"],
    }),
  });
  return null;
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const requestContext = await loadRouteVersionRequestContext(ctx);
  if (requestContext instanceof Response) return requestContext;
  const { access, trimmedActionId } = requestContext;

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
    const authorized = await loadRouteVersionAction({
      actionId: trimmedActionId,
      userId: access.userId,
    });
    if (authorized.kind === "response") return authorized.response;
    const { current, supabase } = authorized;
    const [participantSummary] = await loadActionParticipantSummaries(supabase, {
      actionIds: [trimmedActionId],
      userId: access.userId,
    });
    const validated = validateRouteVersionProposal({
      current,
      proposal: parsed.data,
      confirmedParticipants: participantSummary?.activeCount ?? null,
    });
    if (validated instanceof Response) return validated;
    if (validated.currentVersioning.active.calculation.snapshotHash === validated.snapshotHash) {
      return NextResponse.json({
        status: "unchanged",
        actionId: trimmedActionId,
        activeRouteVersion: validated.currentVersioning.active,
        history: validated.currentVersioning.history,
      });
    }
    const currentPublishedAt = current.published_at;
    const currentUpdatedAt = current.updated_at;
    if (!currentPublishedAt || !currentUpdatedAt) {
      return conflict("L'action a changé avant l'application de l'itinéraire.");
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
    const routeGeometry = parsed.data.operationalRoute.routes[0]!.geometry;
    const geometrySource = resolvePersistedRouteGeometrySource(routeGeometry);
    const persistedGeometry = buildPersistedGeometry({
      drawing: { kind: "polyline", coordinates: routeGeometry.coordinates },
      geometrySourceHint: geometrySource,
      latitude: current.latitude,
      longitude: current.longitude,
      locationLabel: current.location_label,
      departureLocationLabel: preparationData.pointDeRendezVous,
      arrivalLocationLabel: preparationData.zoneCiblePrevue,
    });
    const nextPreparationData = {
      ...preparationData,
      operationalRoute: parsed.data.operationalRoute,
      routeVersioning: nextVersioning,
      ...(geometrySource === "routed"
        ? { routeGeometryProvenance: "server_verified" as const }
        : { routeGeometryProvenance: undefined }),
    };
    const persistenceConflict = await persistRouteVersionUpdate({
      supabase,
      actionId: trimmedActionId,
      currentPublishedAt,
      currentUpdatedAt,
      actorUserId: access.userId,
      updateData: {
        preparation_data: nextPreparationData,
        derived_geometry_kind: persistedGeometry.kind,
        derived_geometry_geojson: persistedGeometry.geojson,
        geometry_confidence: persistedGeometry.confidence,
        geometry_source: persistedGeometry.geometrySource,
      },
    });
    if (persistenceConflict) return persistenceConflict;

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
  const requestContext = await loadRouteVersionRequestContext(ctx);
  if (requestContext instanceof Response) return requestContext;
  const { access, trimmedActionId } = requestContext;

  try {
    const authorized = await loadRouteVersionAction({
      actionId: trimmedActionId,
      userId: access.userId,
    });
    if (authorized.kind === "response") return authorized.response;

    const { current, supabase } = authorized;
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

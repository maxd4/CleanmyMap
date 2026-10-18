import { NextResponse } from "next/server";
import { canManageAction } from "@/lib/actions/permissions";
import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { readActionRegistrationRecord } from "@/lib/actions/participation/registration-records";
import { isPublicActionReferenceAvailable } from "@/lib/chat/action-sharing";
import { getCurrentUserIdentity } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadActionById } from "@/lib/actions/store";
import { normalizeActionPreparationData } from "@/lib/route/route-operational";
import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { buildPublicActionPracticalInformation } from "@/lib/actions/participation/group-participation-public-projection";

export const runtime = "nodejs";
// Justification Vercel: le briefing relit l'action, les permissions et l'inscription courantes ; il ne doit jamais être servi depuis un cache partagé.
export const dynamic = "force-dynamic";

type DayRouteContext = { params: Promise<{ actionId: string }> };

function finiteCoordinate(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function textOrDefault(defaultValue: string, ...values: unknown[]): string {
  return firstText(...values) ?? defaultValue;
}

function nullable<T>(value: T | null | undefined): T | null {
  return value === undefined ? null : value;
}

async function resolveDayAccess({
  supabase,
  action,
  actionId,
  userId,
}: {
  supabase: ReturnType<typeof getSupabaseServerClient>;
  action: Awaited<ReturnType<typeof loadActionById>>;
  actionId: string;
  userId: string;
}): Promise<boolean | Response> {
  if (!action) return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
  const identity = await getCurrentUserIdentity({ userId });
  const organizerIds = await loadCanonicalActionOrganizerIdsForAction(supabase, actionId);
  const isOrganizer = canManageAction(
    { userId, role: identity?.role ?? null, activeRole: identity?.activeRole ?? null },
    { createdByClerkId: action.created_by_clerk_id },
    organizerIds,
  );
  if (isOrganizer) return true;
  if (!isPublicActionReferenceAvailable(action)) return NextResponse.json({ error: "Action indisponible." }, { status: 404 });
  const registration = await readActionRegistrationRecord(supabase, { actionId, userId });
  return registration?.registration_status === "confirmed"
    ? false
    : NextResponse.json({ error: "Briefing réservé aux bénévoles inscrits." }, { status: 403 });
}

function buildDayPayload(action: NonNullable<Awaited<ReturnType<typeof loadActionById>>>, actionId: string, isOrganizer: boolean) {
  const preparation = normalizeActionPreparationData(action.preparation_data ?? {});
  const practicalInfo = buildPublicActionPracticalInformation(preparation);
  const metadata = extractActionMetadataFromNotes(action.notes);
  const latitude = finiteCoordinate(action.latitude);
  const longitude = finiteCoordinate(action.longitude);
  return {
    status: "ok",
    actionId,
    access: isOrganizer ? "organizer" : "confirmed_volunteer",
    action: {
      status: action.status,
      publishedAt: nullable(action.published_at),
      actionPhase: action.action_phase,
      title: textOrDefault(action.location_label, preparation.actionTitle),
      actionDate: action.action_date,
      locationLabel: action.location_label,
      meetingPoint: textOrDefault(action.location_label, preparation.pointDeRendezVous),
      meetingTime: firstText(preparation.meetingTime, action.event_start_time),
      eventStartTime: nullable(action.event_start_time),
      eventEndTime: nullable(action.event_end_time),
      organizerLabel: textOrDefault("Organisateur", metadata.associationName, action.actor_name),
      participantMessage: firstText(preparation.participantMessage),
      safetyInstructions: firstText(preparation.safetyInstructions),
      recommendedMaterials: firstText(preparation.recommendedMaterials),
      materialsProvided: firstText(preparation.materialsProvided),
      equipmentProvided: practicalInfo.equipmentProvided,
      refreshmentsProvided: practicalInfo.refreshmentsProvided,
      accessibility: firstText(preparation.accessibility),
      accessibilityStatus: preparation.accessibilityStatus ?? "not_evaluated",
      checklist: (preparation.preparationChecklist ?? []).map((item) => ({ key: item.key, label: item.label, checked: item.checked })),
      route: {
        topology: nullable(preparation.routeTopology),
        departureLabel: firstText(metadata.departureLocationLabel),
        arrivalLabel: firstText(metadata.arrivalLocationLabel),
        hasSelectedOperationalRoute: Boolean(preparation.operationalRoute),
        targetDistanceKm: nullable(preparation.routeTargetDistanceKm),
        networkDistanceKm: nullable(preparation.routeNetworkDistanceKm),
      },
      map: { latitude, longitude, geometrySource: nullable(action.geometry_source), hasGeometry: Boolean(action.derived_geometry_geojson) },
    },
  };
}

export async function GET(request: Request, context: DayRouteContext) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();

  try {
    const { actionId } = await context.params;
    const normalizedActionId = actionId.trim();
    const supabase = getSupabaseServerClient(true);
    const action = await loadActionById(supabase, normalizedActionId);
    if (!action) return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
    const dayAccess = await resolveDayAccess({ supabase, action, actionId: normalizedActionId, userId: access.userId });
    if (dayAccess instanceof Response) return dayAccess;
    return NextResponse.json(buildDayPayload(action, normalizedActionId, dayAccess));
  } catch (error) {
    return handleApiError(error, "GET /api/actions/[actionId]/day");
  }
}

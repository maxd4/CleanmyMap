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
import { deriveActionPreparationReadiness } from "@/lib/actions/action-preparation-checklist";
import { loadActionParticipantSummaries } from "@/lib/actions/participation/participant-summaries";
import { buildPlannerWeatherRequest } from "@/lib/weather/planner-weather";
import { loadActiveActionFieldRoleAssignments } from "@/lib/actions/field-roles";
import { loadParticipantProfilesForUserIds } from "@/lib/actions/participation/group-participation.helpers";
import { loadActionBuddyState } from "@/lib/actions/action-buddy";

export const runtime = "nodejs";
// Justification Vercel: le briefing relit l'action, les permissions et l'inscription courantes ; il ne doit jamais être servi depuis un cache partagé.
export const dynamic = "force-dynamic";
// no-store includes private accepted-buddy identity and the current organizer assignment projection.

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
  if (action.access_mode !== "invite_link" && !isPublicActionReferenceAvailable(action)) {
    return NextResponse.json({ error: "Action indisponible." }, { status: 404 });
  }
  const registration = await readActionRegistrationRecord(supabase, { actionId, userId });
  return registration?.registration_status === "confirmed"
    ? false
    : NextResponse.json({ error: "Briefing réservé aux bénévoles inscrits." }, { status: 403 });
}

function buildDayPayload(
  action: NonNullable<Awaited<ReturnType<typeof loadActionById>>>,
  actionId: string,
  isOrganizer: boolean,
  confirmedParticipants: number | null,
  welcomeContactLabel: string | null,
  acceptedBuddyLabel: string | null,
) {
  const preparation = normalizeActionPreparationData(action.preparation_data ?? {});
  const weatherRequest = buildPlannerWeatherRequest({
    latitude: action.latitude,
    longitude: action.longitude,
    actionDate: action.action_date,
    scheduledStartTime: action.event_start_time ?? preparation.meetingTime ?? preparation.departureTime,
    scheduledEndTime: action.event_end_time,
    timeZone: action.action_timezone,
  });
  const projectedPracticalInfo = buildPublicActionPracticalInformation(preparation, {
    confirmedParticipants,
    weatherRequest,
  });
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
      wasteCategories: projectedPracticalInfo.wasteCategories ?? [],
      recommendedMaterials: firstText(preparation.recommendedMaterials),
      materialsProvided: firstText(preparation.materialsProvided),
      equipmentProvided: projectedPracticalInfo.equipmentProvided,
      equipmentNotProvided: projectedPracticalInfo.equipmentNotProvided,
      refreshmentsProvided: projectedPracticalInfo.refreshmentsProvided,
      volunteerChecklist: projectedPracticalInfo.volunteerChecklist,
      preparationReadiness: deriveActionPreparationReadiness({
        ...preparation,
        actionDate: firstText(preparation.actionDate, action.action_date) ?? "",
        pointDeRendezVous: firstText(preparation.pointDeRendezVous, action.location_label) ?? "",
        meetingTime: firstText(preparation.meetingTime, action.event_start_time) ?? "",
        departureTime: firstText(preparation.departureTime, action.event_start_time) ?? "",
      }),
      accessibility: firstText(preparation.accessibility),
      accessibilityStatus: preparation.accessibilityStatus ?? "not_evaluated",
      accessibilityConditionsSource: preparation.accessibilityConditionsSource ?? null,
      accessibilityConditionsVerifiedAt: preparation.accessibilityConditionsVerifiedAt ?? null,
      accessibilityPausePlan: preparation.accessibilityPausePlan ?? null,
      accessibilityEarlyDeparturePlan: preparation.accessibilityEarlyDeparturePlan ?? null,
      accessibilityAlternativeMissions: preparation.accessibilityAlternativeMissions ?? [],
      accessibilityAlternativeRoute: projectedPracticalInfo.accessibilityAlternativeRoute ?? null,
      welcomeContactLabel,
      acceptedBuddyLabel,
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
    const summaries = await loadActionParticipantSummaries(supabase, { actionIds: [normalizedActionId], userId: null });
    const confirmedParticipants = summaries.find((summary) => summary.actionId === normalizedActionId)?.activeCount ?? null;
    const roles = await loadActiveActionFieldRoleAssignments(supabase, normalizedActionId);
    const welcomeContact = roles.find(({ role_code, assignment_status }) => role_code === "welcome_contact" && assignment_status === "active");
    const profiles = welcomeContact ? await loadParticipantProfilesForUserIds(supabase, [welcomeContact.user_id]) : new Map();
    const contact = welcomeContact ? profiles.get(welcomeContact.user_id) : null;
    const welcomeContactLabel = contact?.display_name?.trim() || contact?.handle?.trim() || null;
    const buddyRegistration = dayAccess && action.action_phase === "pre_action"
      ? await readActionRegistrationRecord(supabase, { actionId: normalizedActionId, userId: access.userId })
      : null;
    const mayReadBuddy = !dayAccess || buddyRegistration?.registration_status === "confirmed";
    const buddy = !mayReadBuddy || action.action_phase !== "pre_action"
      ? null
      : await loadActionBuddyState(supabase, { actionId: normalizedActionId, userId: access.userId });
    const acceptedBuddyLabel = buddy?.matchedPartner?.displayName || buddy?.matchedPartner?.handle || null;
    return NextResponse.json(buildDayPayload(action, normalizedActionId, dayAccess, confirmedParticipants, welcomeContactLabel, acceptedBuddyLabel), {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/[actionId]/day");
  }
}

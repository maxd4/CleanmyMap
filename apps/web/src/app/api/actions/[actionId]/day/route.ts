import { NextResponse } from "next/server";
import { canManageAction } from "@/lib/actions/permissions";
import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { readActionRegistrationRecord } from "@/lib/actions/participation/registration-records";
import { isPublicActionReferenceAvailable } from "@/lib/chat/action-sharing";
import { getCurrentUserIdentity, requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadActionById } from "@/lib/actions/store";
import { normalizeActionPreparationData } from "@/lib/route/route-operational";
import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DayRouteContext = { params: Promise<{ actionId: string }> };

function finiteCoordinate(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function GET(_request: Request, context: DayRouteContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();

  try {
    const { actionId } = await context.params;
    const normalizedActionId = actionId.trim();
    const supabase = getSupabaseServerClient(true);
    const action = await loadActionById(supabase, normalizedActionId);
    if (!action) return NextResponse.json({ error: "Action introuvable." }, { status: 404 });

    const identity = await getCurrentUserIdentity();
    const organizerIds = await loadCanonicalActionOrganizerIdsForAction(supabase, normalizedActionId);
    const isOrganizer = canManageAction(
      { userId: access.userId, role: identity?.role ?? null, activeRole: identity?.activeRole ?? null },
      { createdByClerkId: action.created_by_clerk_id },
      organizerIds,
    );

    if (!isOrganizer) {
      if (!isPublicActionReferenceAvailable(action)) {
        return NextResponse.json({ error: "Action indisponible." }, { status: 404 });
      }
      const registration = await readActionRegistrationRecord(supabase, { actionId: normalizedActionId, userId: access.userId });
      if (registration?.registration_status !== "confirmed") {
        return NextResponse.json({ error: "Briefing réservé aux bénévoles inscrits." }, { status: 403 });
      }
    }

    const preparation = normalizeActionPreparationData(action.preparation_data ?? {});
    const metadata = extractActionMetadataFromNotes(action.notes);
    const latitude = finiteCoordinate(action.latitude);
    const longitude = finiteCoordinate(action.longitude);
    const geometrySource = action.geometry_source ?? null;

    return NextResponse.json({
      status: "ok",
      actionId: normalizedActionId,
      access: isOrganizer ? "organizer" : "confirmed_volunteer",
      action: {
        status: action.status,
        publishedAt: action.published_at ?? null,
        actionPhase: action.action_phase,
        title: preparation.actionTitle?.trim() || action.location_label,
        actionDate: action.action_date,
        locationLabel: action.location_label,
        meetingPoint: preparation.pointDeRendezVous?.trim() || action.location_label,
        meetingTime: (preparation.meetingTime?.trim() || action.event_start_time) ?? null,
        eventStartTime: action.event_start_time ?? null,
        eventEndTime: action.event_end_time ?? null,
        organizerLabel: metadata.associationName?.trim() || action.actor_name?.trim() || "Organisateur",
        participantMessage: preparation.participantMessage?.trim() || null,
        safetyInstructions: preparation.safetyInstructions?.trim() || null,
        recommendedMaterials: preparation.recommendedMaterials?.trim() || null,
        materialsProvided: preparation.materialsProvided?.trim() || null,
        accessibility: preparation.accessibility?.trim() || null,
        accessibilityStatus: preparation.accessibilityStatus ?? "not_evaluated",
        checklist: (preparation.preparationChecklist ?? []).map((item) => ({ key: item.key, label: item.label, checked: item.checked })),
        route: {
          topology: preparation.routeTopology ?? null,
          departureLabel: metadata.departureLocationLabel?.trim() || null,
          arrivalLabel: metadata.arrivalLocationLabel?.trim() || null,
          hasSelectedOperationalRoute: Boolean(preparation.operationalRoute),
          targetDistanceKm: preparation.routeTargetDistanceKm ?? null,
          networkDistanceKm: preparation.routeNetworkDistanceKm ?? null,
        },
        map: {
          latitude,
          longitude,
          geometrySource,
          hasGeometry: Boolean(action.derived_geometry_geojson),
        },
      },
    });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/[actionId]/day");
  }
}

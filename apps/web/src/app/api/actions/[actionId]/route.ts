import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import { buildPersistedNotes, loadActionById } from "@/lib/actions/store";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { getCurrentUserIdentity } from "@/lib/authz";
import { isAdminLikeProfile, type AppProfile } from "@/lib/profiles";
import { updateActionSchema } from "@/lib/validation/action";

export const runtime = "nodejs";
// Vercel: force dynamic because this route serves authenticated action edits with fresh reads.
export const dynamic = "force-dynamic";

function canEditAction(params: {
  userId: string;
  creatorUserId: string | null;
  role: AppProfile | null | undefined;
}): boolean {
  if (params.creatorUserId === params.userId) {
    return true;
  }

  return Boolean(params.role && isAdminLikeProfile(params.role));
}

function buildActionEditorPayload(
  row: Awaited<ReturnType<typeof loadActionById>>,
) {
  if (!row) {
    return null;
  }

  const metadata = extractActionMetadataFromNotes(row.notes);
  return {
    id: row.id,
    status: row.status,
    actionPhase: row.action_phase,
    preparationData: row.preparation_data,
    createdByClerkId: row.created_by_clerk_id,
    actorName: row.actor_name,
    actionDate: row.action_date,
    locationLabel: row.location_label,
    latitude: row.latitude,
    longitude: row.longitude,
    wasteKg: row.waste_kg,
    cigaretteButts: row.cigarette_butts,
    volunteersCount: row.volunteers_count,
    durationMinutes: row.duration_minutes,
    notes: metadata.cleanNotes,
    submissionMode: metadata.submissionMode,
    associationName: metadata.associationName,
    groupJoinEnabled: metadata.groupJoinEnabled,
    placeType: metadata.placeType,
    departureLocationLabel: metadata.departureLocationLabel,
    arrivalLocationLabel: metadata.arrivalLocationLabel,
    routeStyle: metadata.routeStyle,
    routeAdjustmentMessage: metadata.routeAdjustmentMessage,
    wasteBreakdown: metadata.wasteBreakdown,
    photos: metadata.photos,
    visionEstimate: metadata.visionEstimate,
  };
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const session = await auth();
  if (!session.userId) {
    return unauthorizedJsonResponse();
  }

  const { actionId } = await ctx.params;
  const trimmedActionId = actionId.trim();
  if (!trimmedActionId) {
    return validationErrorResponse({
      actionId: ["Identifiant d'action manquant."],
    });
  }

  try {
    const supabase = getSupabaseServerClient();
    const row = await loadActionById(supabase, trimmedActionId);
    if (!row) {
      return NextResponse.json(
        { error: "Action introuvable." },
        { status: 404 },
      );
    }

    const identity = await getCurrentUserIdentity();
    if (
      !canEditAction({
        userId: session.userId,
        creatorUserId: row.created_by_clerk_id,
        role: identity?.role,
      })
    ) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à lire cette action." },
        { status: 403 },
      );
    }

    const action = buildActionEditorPayload(row);
    return NextResponse.json({ status: "ok", action });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/:actionId");
  }
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const session = await auth();
  if (!session.userId) {
    return unauthorizedJsonResponse();
  }

  const { actionId } = await ctx.params;
  const trimmedActionId = actionId.trim();
  if (!trimmedActionId) {
    return validationErrorResponse({
      actionId: ["Identifiant d'action manquant."],
    });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = updateActionSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

  try {
    const supabase = getSupabaseServerClient();
    const current = await loadActionById(supabase, trimmedActionId);
    if (!current) {
      return NextResponse.json(
        { error: "Action introuvable." },
        { status: 404 },
      );
    }

    const identity = await getCurrentUserIdentity();
    if (
      !canEditAction({
        userId: session.userId,
        creatorUserId: current.created_by_clerk_id,
        role: identity?.role,
      })
    ) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à modifier cette action." },
        { status: 403 },
      );
    }

    const updateData: Record<string, unknown> = {};
    const body = parsed.data;
    const currentMetadata = extractActionMetadataFromNotes(current.notes);
    const shouldRefreshNotes = Object.entries(body).some(
      ([key, value]) =>
        key !== "actionPhase" &&
        key !== "preparationData" &&
        value !== undefined,
    );

    if (body.actionPhase) {
      updateData.action_phase = body.actionPhase;
      if (body.actionPhase === "pre_action") {
        updateData.status = "pending";
      } else if (body.actionPhase === "post_action_complete") {
        updateData.status = "approved";
      }
    }
    if (body.preparationData !== undefined) {
      updateData.preparation_data = body.preparationData ?? {};
    }
    if (body.actorName !== undefined) {
      updateData.actor_name = body.actorName.trim() || null;
    }
    if (body.actionDate !== undefined) {
      updateData.action_date = body.actionDate;
    }
    if (body.locationLabel !== undefined) {
      updateData.location_label = body.locationLabel.trim();
    }
    if (body.latitude !== undefined) {
      updateData.latitude = body.latitude;
    }
    if (body.longitude !== undefined) {
      updateData.longitude = body.longitude;
    }
    if (body.wasteKg !== undefined) {
      updateData.waste_kg = body.wasteKg;
    }
    if (body.cigaretteButts !== undefined) {
      updateData.cigarette_butts = body.cigaretteButts;
    }
    if (body.volunteersCount !== undefined) {
      updateData.volunteers_count = body.volunteersCount;
    }
    if (body.durationMinutes !== undefined) {
      updateData.duration_minutes = body.durationMinutes;
    }
    if (shouldRefreshNotes) {
      const persistedPayload = {
        associationName:
          body.associationName ?? currentMetadata.associationName ?? undefined,
        groupJoinEnabled:
          body.groupJoinEnabled ?? currentMetadata.groupJoinEnabled,
        departureLocationLabel:
          body.departureLocationLabel ??
          currentMetadata.departureLocationLabel ??
          undefined,
        arrivalLocationLabel:
          body.arrivalLocationLabel ??
          currentMetadata.arrivalLocationLabel ??
          undefined,
        routeStyle: body.routeStyle ?? currentMetadata.routeStyle ?? undefined,
        routeAdjustmentMessage:
          body.routeAdjustmentMessage ??
          currentMetadata.routeAdjustmentMessage ??
          undefined,
        notes: body.notes ?? currentMetadata.cleanNotes ?? undefined,
        placeType: body.placeType ?? currentMetadata.placeType ?? undefined,
        submissionMode:
          body.submissionMode ?? currentMetadata.submissionMode ?? undefined,
        wasteBreakdown:
          body.wasteBreakdown ?? currentMetadata.wasteBreakdown ?? undefined,
        photos:
          body.photos?.map((photo) => ({
            id: photo.id,
            name: photo.name,
            mimeType: photo.mimeType,
            size: photo.size,
            width: photo.width ?? null,
            height: photo.height ?? null,
          })) ?? currentMetadata.photos ?? undefined,
        visionEstimate:
          body.visionEstimate ?? currentMetadata.visionEstimate ?? undefined,
      } satisfies Parameters<typeof buildPersistedNotes>[0];
      const persistedNotes = buildPersistedNotes(persistedPayload);
      updateData.notes = persistedNotes;
    }

    const updateResult = await supabase
      .from("actions")
      .update(updateData)
      .eq("id", trimmedActionId)
      .select("id")
      .single();

    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }

    return NextResponse.json({
      status: "ok",
      actionId: trimmedActionId,
      actionPhase: body.actionPhase ?? current.action_phase,
    });
  } catch (error) {
    return handleApiError(error, "PATCH /api/actions/:actionId");
  }
}

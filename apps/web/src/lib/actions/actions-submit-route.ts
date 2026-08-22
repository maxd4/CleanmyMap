import type { CreateActionInput } from "@/lib/validation/action";
import {
  createAction,
  resolveActionCreationStatus,
} from "@/lib/actions/store";
import {
  canAutoApproveOwnAction,
  canUseAdminOverride,
} from "@/lib/actions/permissions";
import {
  getCurrentUserIdentity,
  pickTraceableActorName,
} from "@/lib/authz";
import {
  resolveActionOrganizers,
  resolveActionParticipants,
  resolveDefaultActionOrganizerIds,
} from "@/lib/actions/organizers";
import { getVolunteerActionValidationIssues } from "@/lib/actions/submission-validation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  emitActionCreated,
  emitSpotCreated,
} from "@/lib/events/emit";
import { trackServerEvent } from "@/lib/analytics.server";
import { buildPostActionRetentionLoop as buildActionRetentionLoop } from "@/lib/gamification/progression";

type RetentionLoop = Awaited<ReturnType<typeof buildActionRetentionLoop>>;

export type ActionSubmissionResult =
  | {
      kind: "validation-error";
      details: Record<string, string[]>;
    }
  | {
      kind: "api-error";
      error: unknown;
      context: string;
    }
  | {
      kind: "created";
      body: {
        status: "created";
        id: string;
        source: "actions" | "spots";
        retentionLoop: RetentionLoop | null;
      };
    };

type SubmitActionCreationParams = {
  userId: string;
  payload: CreateActionInput;
  analyticsConsentGranted: boolean;
};

function buildValidationDetails(
  issues: ReturnType<typeof getVolunteerActionValidationIssues>,
): Record<string, string[]> {
  return issues.reduce<Record<string, string[]>>((acc, issue) => {
    const current = acc[issue.field] ?? [];
    current.push(issue.message);
    acc[issue.field] = current;
    return acc;
  }, {});
}

export async function submitActionCreation({
  userId,
  payload,
  analyticsConsentGranted,
}: SubmitActionCreationParams): Promise<ActionSubmissionResult> {
  const supabase = getSupabaseServerClient();
  const identity = await getCurrentUserIdentity();
  const isCreatorAdminLike = canUseAdminOverride(identity);
  const canAutoApproveOwnSubmission = canAutoApproveOwnAction(identity, {
    createdByClerkId: userId,
  });

  const resolvedIdentity = identity ?? {
    displayName: userId,
    handle: userId,
    username: userId,
    email: null,
  };
  const actorName = pickTraceableActorName(identity, payload.actorName);
  const normalizedPayload = {
    ...payload,
    actorName,
  };

  if (normalizedPayload.submissionMode !== "quick") {
    const volunteerIssues =
      getVolunteerActionValidationIssues(normalizedPayload);
    if (volunteerIssues.length > 0) {
      return {
        kind: "validation-error",
        details: buildValidationDetails(volunteerIssues),
      };
    }
  }

  const isSpontaneousAction =
    normalizedPayload.recordType === "action" &&
    normalizedPayload.associationName === "Action spontanée";
  const providedOrganizerAccounts =
    normalizedPayload.organizerAccounts ?? [];
  const organizerAccounts =
    providedOrganizerAccounts.length > 0
      ? providedOrganizerAccounts
      : normalizedPayload.recordType === "action" &&
          !isSpontaneousAction
        ? resolveDefaultActionOrganizerIds({
            creatorUserId: userId,
            creatorIsAdminLike: isCreatorAdminLike,
          })
        : [];

  const organizerResolution =
    normalizedPayload.recordType === "action"
      ? await resolveActionOrganizers({
          supabase,
          creator: {
            userId,
            displayName: resolvedIdentity.displayName,
            handle: resolvedIdentity.handle,
            username: resolvedIdentity.username,
            email: resolvedIdentity.email,
          },
          organizerAccounts,
          includeCreatorAsPrimary: isSpontaneousAction,
        })
      : {
          organizers: [],
          unresolvedTokens: [] as string[],
        };

  if (organizerResolution.unresolvedTokens.length > 0) {
    return {
      kind: "validation-error",
      details: {
        organizerAccounts: [
          `Comptes organisateurs introuvables: ${organizerResolution.unresolvedTokens.join(", ")}`,
        ],
      },
    };
  }

  const participantResolution =
    normalizedPayload.recordType === "action"
      ? await resolveActionParticipants({
          supabase,
          creator: {
            userId,
            displayName: resolvedIdentity.displayName,
            handle: resolvedIdentity.handle,
            username: resolvedIdentity.username,
            email: resolvedIdentity.email,
          },
          participantAccounts: normalizedPayload.participantAccounts,
          organizerIds: organizerResolution.organizers.map(
            (organizer) => organizer.userId,
          ),
        })
      : {
          participants: [],
          unresolvedTokens: [] as string[],
        };

  if (participantResolution.unresolvedTokens.length > 0) {
    return {
      kind: "validation-error",
      details: {
        participantAccounts: [
          `Comptes participants introuvables: ${participantResolution.unresolvedTokens.join(", ")}`,
        ],
      },
    };
  }

  if (
    normalizedPayload.recordType === "clean_place" ||
    normalizedPayload.recordType === "spot"
  ) {
    const label = normalizedPayload.locationLabel.trim();
    if (label.length < 2) {
      return {
        kind: "validation-error",
        details: {
          locationLabel: ["Le lieu propre doit être renseigné."],
        },
      };
    }

    const composedNotes = normalizedPayload.notes?.trim()
      ? `[spot-by:${actorName}] ${normalizedPayload.notes.trim()}`
      : `[spot-by:${actorName}]`;

    const inserted = await supabase
      .from("spots")
      .insert({
        created_by_clerk_id: userId,
        label,
        waste_type: normalizedPayload.recordType,
        latitude: normalizedPayload.latitude ?? null,
        longitude: normalizedPayload.longitude ?? null,
        status: "new",
        notes: composedNotes,
      })
      .select(
        "id, created_at, label, waste_type, latitude, longitude, status, notes",
      )
      .single();

    if (inserted.error) {
      return {
        kind: "api-error",
        error: inserted.error,
        context: "POST /api/actions (spot insert)",
      };
    }

    emitSpotCreated({
      spotId: String(inserted.data.id),
      userId,
      label: inserted.data.label,
      wasteType: inserted.data.waste_type,
    });

    if (analyticsConsentGranted) {
      await trackServerEvent(
        userId,
        "spot_created",
        {
          waste_type: inserted.data.waste_type,
          location: inserted.data.label,
        },
        {
          consentGranted: analyticsConsentGranted,
        },
      );
    }

    return {
      kind: "created",
      body: {
        status: "created",
        id: inserted.data.id,
        source: "spots",
        retentionLoop: null,
      },
    };
  }

  const created = await createAction(supabase, {
    userId,
    payload: normalizedPayload,
    organizers: organizerResolution.organizers,
    manualParticipants: participantResolution.participants,
    status:
      normalizedPayload.recordType === "action"
        ? normalizedPayload.actionPhase === "post_action_draft"
          ? "pending"
          : canAutoApproveOwnSubmission
            ? "approved"
            : "pending"
        : resolveActionCreationStatus(canAutoApproveOwnSubmission),
  });

  emitActionCreated({
    actionId: created.id,
    userId,
    locationLabel: normalizedPayload.locationLabel,
    wasteKg: Number(normalizedPayload.wasteKg) || 0,
  });

  import("@/lib/gamification/progression-tracking").then(
    ({ trackNewPlaceVisited }) => {
      trackNewPlaceVisited(supabase, {
        userId,
        locationLabel: normalizedPayload.locationLabel,
      }).catch((error) =>
        console.error("trackNewPlaceVisited error", error),
      );
    },
  );

  const retentionLoop = await buildActionRetentionLoop(supabase, {
    userId,
    actionId: created.id,
  }).catch(() => null);

  return {
    kind: "created",
    body: {
      status: "created",
      id: created.id,
      source: "actions",
      retentionLoop,
    },
  };
}

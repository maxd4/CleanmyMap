import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import { isRenderableDrawing, parseDrawingFromGeoJson } from "@/lib/actions/geometry/derived-geometry";
import { parseDrawingFromNotes } from "@/lib/actions/geometry/drawing";
import type { ActionFormalitiesWorkflowState } from "@/lib/actions/formalities-workflow";
import type { ActionPreparationData, ActionWasteBreakdown } from "@/lib/actions/types";
import { hasCigaretteButtsMeasurement } from "@/lib/waste/cigarette-butts";
import type { ActionQualityGrade } from "@/lib/actions/quality/quality-rules";
import type { ActionRow, ProgressionEventType } from "./progression-types";

const ACTION_MILESTONE_IDS = [
  "boucle_bouclee",
  "mobilisateur",
  "donnee_exemplaire",
  "parcours_documente",
  "mesure_tracable",
  "tri_documente",
  "formalites_preparees",
] as const;

export type ActionMilestoneId = (typeof ACTION_MILESTONE_IDS)[number];

export type ActionMilestoneAssessment = {
  id: ActionMilestoneId;
  eventType: ProgressionEventType;
  xpAwarded: 0 | 1;
  qualified: boolean;
  reason: string;
};

export type ActionMilestoneInput = {
  action: ActionRow;
  userId: string;
  canonicalOrganizerIds: readonly string[];
  confirmedParticipantUserIds?: readonly string[];
  validationQualityGrade?: ActionQualityGrade | null;
};

export const ACTION_MILESTONE_EVENT_TYPES: Record<ActionMilestoneId, ProgressionEventType> = {
  boucle_bouclee: "action_loop_completed",
  mobilisateur: "action_mobilizer",
  donnee_exemplaire: "action_exemplary_data",
  parcours_documente: "action_documented_route",
  mesure_tracable: "action_traceable_measurement",
  tri_documente: "action_documented_sorting",
  formalites_preparees: "action_formalities_prepared",
};

const XP_MILESTONES = new Set<ActionMilestoneId>([
  "boucle_bouclee",
  "mobilisateur",
  "donnee_exemplaire",
]);

function preparationDataFor(action: ActionRow): ActionPreparationData {
  return action.preparation_data ?? {};
}

function hasPersistedPreparationJourney(action: ActionRow): boolean {
  return action.action_phase === "post_action_complete" && Boolean(action.published_at);
}

export function isCurrentActionValidated(action: ActionRow): boolean {
  return (
    action.status === "approved" &&
    (action.action_phase ?? "post_action_complete") === "post_action_complete"
  );
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function canonicalBreakdown(metadata: ReturnType<typeof extractActionMetadataFromNotes>): ActionWasteBreakdown | null {
  return metadata.wasteBreakdown ?? null;
}

function hasDocumentedSorting(metadata: ReturnType<typeof extractActionMetadataFromNotes>): boolean {
  const breakdown = canonicalBreakdown(metadata);
  if (!breakdown) return false;

  const values = [
    breakdown.recyclablesKg,
    breakdown.glassKg,
    breakdown.householdWasteKg,
    breakdown.otherWasteKg,
  ].filter(isFiniteNonNegative);

  return values.length >= 2 && values.some((value) => value > 0);
}

function hasTraceableMeasurement(action: ActionRow, metadata: ReturnType<typeof extractActionMetadataFromNotes>): boolean {
  const method = metadata.wasteMeasurementMethod;
  if (!method || method === "inconnue") return false;

  const hasMeasuredWaste = isFiniteNonNegative(action.waste_kg);
  const hasMeasuredBreakdown = Object.values(canonicalBreakdown(metadata) ?? {}).some(
    (value) => isFiniteNonNegative(value),
  );
  const butts = metadata.cigaretteButtsMeasurements;
  const hasMeasuredButts = hasCigaretteButtsMeasurement(butts) && Boolean(
    butts &&
      [
        butts.cigaretteButtsCountProvenance,
        butts.cigaretteButtsMassProvenance,
        butts.cigaretteButtsVolumeProvenance,
      ].some((provenance) => provenance !== "unknown" && provenance !== "estimated"),
  );

  return hasMeasuredWaste || hasMeasuredBreakdown || hasMeasuredButts;
}

function hasDocumentedGeometry(action: ActionRow): boolean {
  const source = action.geometry_source;
  if (!source || source === "estimated_route" || source === "estimated_area" || source === "fallback_point") {
    return false;
  }

  const drawing =
    parseDrawingFromGeoJson(action.derived_geometry_geojson, action.derived_geometry_kind ?? null) ??
    parseDrawingFromNotes(action.notes).manualDrawing;
  if (!isRenderableDrawing(drawing)) return false;

  const preparation = preparationDataFor(action);
  if (source === "gpx_import") {
    return preparation.gpxImport?.source === "gpx_import";
  }
  if (source === "routed") {
    return (
      preparation.routeGeometryMode === "network" &&
      preparation.routeGeometryProvider !== undefined &&
      preparation.routeGeometryProvider !== "none"
    );
  }
  return source === "manual" || source === "reference";
}

function hasPreparedFormalities(action: ActionRow): boolean {
  const workflow = preparationDataFor(action).formalitiesWorkflow as ActionFormalitiesWorkflowState | undefined;
  if (!workflow || !Array.isArray(workflow.trace?.formalities) || !Array.isArray(workflow.progress)) {
    return false;
  }

  const progressById = new Map(workflow.progress.map((item) => [item.formalityId, item]));
  const requiredFormalities = workflow.trace.formalities.filter(
    (formality) => formality.requirementStatus === "required",
  );
  if (requiredFormalities.length === 0) {
    return false;
  }

  return requiredFormalities.every((formality) => {
      const progress = progressById.get(formality.id);
      return Boolean(
        progress &&
          progress.active &&
          progress.validForQualification &&
          progress.userStatus === "sent",
      );
    });
}

function qualifiesCurrentAction(
  validated: boolean,
  isCanonicalOrganizer: boolean,
  fact: boolean,
): boolean {
  return validated && isCanonicalOrganizer && fact;
}

function hasPublishedGroupRegistration(
  metadata: ReturnType<typeof extractActionMetadataFromNotes>,
  action: ActionRow,
  isOtherConfirmedParticipant: boolean,
): boolean {
  return metadata.groupJoinEnabled === true &&
    Boolean(action.published_at) &&
    isOtherConfirmedParticipant;
}

export function assessActionMilestones(input: ActionMilestoneInput): ActionMilestoneAssessment[] {
  const { action, userId, canonicalOrganizerIds } = input;
  const metadata = extractActionMetadataFromNotes(action.notes);
  const validated = isCurrentActionValidated(action);
  const isCanonicalOrganizer = canonicalOrganizerIds.includes(userId);
  const isOtherConfirmedParticipant = (input.confirmedParticipantUserIds ?? []).some(
    (participantUserId) => participantUserId !== userId,
  );
  const qualityGrade = input.validationQualityGrade ?? null;

  const qualifications: Record<ActionMilestoneId, { qualified: boolean; reason: string }> = {
    boucle_bouclee: {
      qualified: qualifiesCurrentAction(validated, isCanonicalOrganizer, hasPersistedPreparationJourney(action)),
      reason: "organisateur canonique + pré-action effectivement publiée + post-action finalisée + validation actuelle",
    },
    mobilisateur: {
      qualified: qualifiesCurrentAction(
        validated,
        isCanonicalOrganizer,
        hasPublishedGroupRegistration(metadata, action, isOtherConfirmedParticipant),
      ),
      reason: "inscriptions de groupe publiées + autre participant confirmé + validation actuelle",
    },
    donnee_exemplaire: {
      qualified: qualifiesCurrentAction(validated, isCanonicalOrganizer, qualityGrade === "A"),
      reason: "grade A historisé au moment de la validation actuelle",
    },
    parcours_documente: {
      qualified: qualifiesCurrentAction(validated, isCanonicalOrganizer, hasDocumentedGeometry(action)),
      reason: "géométrie exploitable et provenance canonique vérifiable",
    },
    mesure_tracable: {
      qualified: qualifiesCurrentAction(validated, isCanonicalOrganizer, hasTraceableMeasurement(action, metadata)),
      reason: "mesure environnementale avec méthode et provenance exploitable",
    },
    tri_documente: {
      qualified: qualifiesCurrentAction(validated, isCanonicalOrganizer, hasDocumentedSorting(metadata)),
      reason: "ventilation canonique multi-flux non fictive",
    },
    formalites_preparees: {
      qualified: qualifiesCurrentAction(validated, isCanonicalOrganizer, hasPreparedFormalities(action)),
      reason: "toutes les formalités requises sont actives, valides et finalisées dans le workflow",
    },
  };

  return ACTION_MILESTONE_IDS.map((id) => ({
    id,
    eventType: ACTION_MILESTONE_EVENT_TYPES[id],
    xpAwarded: XP_MILESTONES.has(id) ? 1 : 0,
    qualified: qualifications[id].qualified,
    reason: qualifications[id].reason,
  }));
}

export function actionMilestoneSourceId(id: ActionMilestoneId): string {
  return `action-milestone:${id}`;
}

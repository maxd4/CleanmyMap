import { z } from "zod";
import {
  normalizeCreatePayload,
  type ActionContractCreatePayload,
} from "@/lib/actions/data-contract";
import { isValidAssociationName } from "@/lib/actions/association-options";
import { isOrganizerType, type OrganizerType } from "@/lib/actions/organizer-type";
import type { CreateActionPayload } from "@/lib/actions/types";
import { ACTION_GEOMETRY_SOURCES } from "@/lib/actions/types";
import { isWasteCategorySlug } from "@/lib/waste";
import { isRouteCalibrationContext } from "@/lib/route/route-calibration";
import type { RouteCalibrationContext } from "@/lib/route/route-calibration";
import {
  isLegacyActualRoute,
  isOperationalRoute,
  normalizeOperationalRoute,
} from "@/lib/route/route-operational";
import type { OperationalRoute } from "@/lib/route/route-operational";
import {
  isRoutePlannerProofShape,
  type RoutePlannerProof,
} from "@/lib/route/route-planner-proof-contract";
import {
  getTimeContractValidationMessage,
  isValidClockTime,
} from "@/lib/actions/time-contract";
import {
  isAlignedToWasteMassResolution,
  ACTION_WASTE_MASS_RESOLUTION_KG,
  ACTION_WASTE_MEASUREMENT_METHODS,
} from "@/lib/waste/measurement";
import { MAX_CIGARETTE_BUTTS_COUNT } from "@/lib/waste/cigarette-butts";
import { normalizeVolunteerParticipation } from "@/lib/actions/volunteer-participation";

const coordinateSchema = z.tuple([
  z.number().min(-90).max(90),
  z.number().min(-180).max(180),
]);

const manualDrawingSchema = z
  .object({
    kind: z.enum(["polyline", "polygon"]),
    coordinates: z.array(coordinateSchema).max(400),
  })
  .superRefine((value, ctx) => {
    const minimumPoints = value.kind === "polygon" ? 3 : 2;
    if (value.coordinates.length < minimumPoints) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          value.kind === "polygon"
            ? "Le polygone doit contenir au moins 3 points."
            : "Le trace doit contenir au moins 2 points.",
      });
    }
  });

const contractGeometrySchema = z
  .object({
    kind: z.enum(["polyline", "polygon"]),
    coordinates: z.array(coordinateSchema).max(400),
    geometrySource: z.enum(ACTION_GEOMETRY_SOURCES).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    const minimumPoints = value.kind === "polygon" ? 3 : 2;
    if (value.coordinates.length < minimumPoints) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          value.kind === "polygon"
            ? "Le polygone doit contenir au moins 3 points."
            : "Le trace doit contenir au moins 2 points.",
      });
    }
  });

const wasteMassSchema = z
  .number()
  .min(0)
  .max(100000)
  .refine(
    (value) => isAlignedToWasteMassResolution(value, ACTION_WASTE_MASS_RESOLUTION_KG),
    "La masse doit respecter une résolution de 0,1 kg.",
  );

const wasteBreakdownSchema = z.object({
  recyclablesKg: wasteMassSchema.nullable().optional(),
  glassKg: wasteMassSchema.nullable().optional(),
  householdWasteKg: wasteMassSchema.nullable().optional(),
  otherWasteKg: wasteMassSchema.nullable().optional(),
  unusualObjects: z.string().max(2000).nullable().optional(),
  specialHandlingWaste: z.string().max(2000).nullable().optional(),
  // Bounded read compatibility for existing metadata markers.
  megotsKg: z.number().min(0).max(100000).optional(),
  megotsCondition: z.enum(["propre", "humide", "mouille"]).optional(),
  plastiqueKg: z.number().min(0).max(100000).optional(),
  verreKg: z.number().min(0).max(100000).optional(),
  metalKg: z.number().min(0).max(100000).optional(),
  mixteKg: z.number().min(0).max(100000).optional(),
  triQuality: z.enum(["faible", "moyenne", "elevee"]).optional(),
});

const wasteMeasurementMethodSchema = z
  .enum(ACTION_WASTE_MEASUREMENT_METHODS)
  .nullable()
  .optional();

const cigaretteButtsMeasurementsSchema = z
  .object({
    // Ordinary HTTP payloads carry raw measurements only. Provenance and
    // formula versions are assigned by the server and are not input fields.
    cigaretteButtsCount: z.number().int().min(0).max(MAX_CIGARETTE_BUTTS_COUNT).nullable().optional(),
    cigaretteButtsMassKg: z.number().min(0).max(100_000).nullable().optional(),
    cigaretteButtsVolumeLiters: z.number().min(0).max(100_000).nullable().optional(),
    cigaretteButtsCondition: z
      .enum(["propre", "humide", "mouille"])
      .nullable()
      .optional(),
  })
  .nullable()
  .optional();

const volunteerParticipationInputSchema = z
  .object({
    childrenCount: z.number().int().min(0).max(500).nullable().optional(),
    adultCount: z.number().int().min(0).max(500).nullable().optional(),
    retiredCount: z.number().int().min(0).max(500).nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.childrenCount !== null &&
      value.childrenCount !== undefined &&
      value.adultCount !== null &&
      value.adultCount !== undefined &&
      value.retiredCount !== null &&
      value.retiredCount !== undefined &&
      value.childrenCount + value.adultCount + value.retiredCount > 500
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le total des catégories de bénévoles ne peut pas dépasser 500.",
      });
    }
  });

const volunteerParticipationSchema = volunteerParticipationInputSchema
  .nullable()
  .transform((value) =>
    value === null
      ? value
      : normalizeVolunteerParticipation(value),
  )
  .optional();

const photoAssetSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  mimeType: z.string().min(1).max(80),
  size: z.number().int().min(0).max(25_000_000),
  width: z.number().int().min(0).max(20_000).nullable().optional(),
  height: z.number().int().min(0).max(20_000).nullable().optional(),
  dataUrl: z.string().min(8).max(10_000_000),
});

const visionEstimateSchema = z.object({
  modelVersion: z.string().min(1).max(80),
  source: z.enum(["heuristic", "hybrid", "vision"]),
  provisional: z.boolean(),
  bagsCount: z.object({
    value: z.number().int().min(0).max(1000),
    confidence: z.number().min(0).max(1),
    interval: z.tuple([z.number(), z.number()]).nullable().optional(),
  }),
  fillLevel: z.object({
    value: z.number().min(0).max(100),
    confidence: z.number().min(0).max(1),
    interval: z.tuple([z.number(), z.number()]).nullable().optional(),
  }),
  density: z.object({
    value: z.enum(["sec", "humide_dense", "mouille"]),
    confidence: z.number().min(0).max(1),
    interval: z.tuple([z.number(), z.number()]).nullable().optional(),
  }),
  wasteKg: z.object({
    value: z.number().min(0).max(100000),
    confidence: z.number().min(0).max(1),
    interval: z.tuple([z.number(), z.number()]).nullable().optional(),
  }),
});

const associationNameSchema = z
  .string()
  .min(1)
  .max(120)
  .refine((value) => isValidAssociationName(value), "Association invalide.");

const organizerTypeSchema = z.custom<OrganizerType>(
  isOrganizerType,
  "Type de structure invalide.",
);

const accountTokensSchema = z.array(z.string().min(1).max(120)).max(50).optional();
const wasteCategorySlugSchema = z
  .string()
  .refine(isWasteCategorySlug, "Catégorie de déchet inconnue.");

const preparationDataSchema = z
  .object({
    actionTitle: z.string().max(200).optional(),
    shortDescription: z.string().max(1000).optional(),
    communeZoneLabel: z.string().max(200).optional(),
    pointDeRendezVous: z.string().max(200).optional(),
    zoneCiblePrevue: z.string().max(200).optional(),
    actionDate: z.string().date().optional(),
    meetingTime: z.string().max(20).optional(),
    departureTime: z.string().max(20).optional(),
    estimatedDurationMinutes: z.number().int().min(0).max(24 * 60).optional(),
    plannedObjective: z
      .enum(["repérage", "nettoyage", "collecte_mégots", "action_mixte", "sensibilisation", "autre"])
      .optional(),
    placeType: z.string().max(120).optional(),
    estimatedDifficulty: z.enum(["facile", "moderee", "soutenue"]).optional(),
    accessibility: z.string().max(1000).optional(),
    safetyInstructions: z.string().max(2000).optional(),
    recommendedMaterials: z.string().max(2000).optional(),
    participantMessage: z.string().max(2000).optional(),
    creatorRole: z.enum(["organisateur", "benevole", "association", "etudiant", "autre"]).optional(),
    preparationState: z.enum(["brouillon", "pret_a_partager", "action_en_cours", "a_completer_apres_action"]).optional(),
    administrativeRequirements: z
      .object({
        status: z.enum(["pending", "validated"]),
        validatedAt: z.string().datetime().nullable().optional(),
        validatedByUserId: z.string().min(1).max(120).nullable().optional(),
      })
      .strict()
      .optional(),
    logisticsNotes: z.string().max(2000).optional(),
    checklistBeforeDeparture: z.string().max(2000).optional(),
    volunteersExpected: z.number().int().min(0).max(500).optional(),
    volunteerParticipation: volunteerParticipationSchema,
    groupJoinEnabled: z.boolean().optional(),
    expectedWasteCategories: z.array(wasteCategorySlugSchema).max(20).optional(),
    midRouteLocationLabel: z.string().max(200).optional(),
    routeCalibrationContext: z.custom<RouteCalibrationContext>(
      isRouteCalibrationContext,
      "Contexte historique de calibration invalide.",
    ).optional(),
    operationalRoute: z.custom<OperationalRoute>(
      isOperationalRoute,
      "Parcours opérationnel invalide.",
    ).optional(),
    actualRoute: z.custom(isLegacyActualRoute, "Ancien parcours invalide.").optional(),
  })
  .strict()
  .transform(({ actualRoute, operationalRoute, ...rest }) => ({
    ...rest,
    ...(operationalRoute
      ? { operationalRoute }
      : actualRoute
        ? { operationalRoute: normalizeOperationalRoute(actualRoute)! }
        : {}),
  }));

const routePlannerProofSchema = z
  .custom<RoutePlannerProof>(
    isRoutePlannerProofShape,
    "Preuve du snapshot planner invalide.",
  )
  .nullable()
  .optional();

const actionPhaseSchema = z.enum([
  "pre_action",
  "post_action_draft",
  "post_action_complete",
]);

const eventTimeSchema = z
  .string()
  .trim()
  .refine(isValidClockTime, "L’heure doit respecter le format HH:MM.")
  .nullable()
  .optional();

const userMetadataSchema = z.object({
  userId: z.string().min(1).max(120),
  username: z.string().min(1).max(120).optional(),
  displayName: z.string().min(1).max(200).optional(),
  email: z.string().email().max(200).optional(),
});

function addTemporalContractIssue(
  value: {
    durationMinutes?: number;
    eventStartTime?: string | null;
    eventEndTime?: string | null;
  },
  ctx: z.RefinementCtx,
) {
  const message = getTimeContractValidationMessage({
    actionDurationMinutes: value.durationMinutes ?? 0,
    startTime: value.eventStartTime,
    endTime: value.eventEndTime,
  });
  if (message) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["eventStartTime"],
      message,
    });
  }
}

const createActionLegacyBaseSchema = z.object({
  actorName: z.string().min(1).max(120).optional(),
  associationName: associationNameSchema,
  organizerType: organizerTypeSchema.nullable().optional(),
  organizerAccounts: z.array(z.string().min(1).max(120)).max(20).optional(),
  participantAccounts: accountTokensSchema,
  groupJoinEnabled: z.boolean().optional(),
  recordType: z.enum(["action", "clean_place", "spot"]).optional(),
  placeType: z.string().max(80).optional(),
  actionDate: z.string().date(),
  eventStartTime: eventTimeSchema,
  eventEndTime: eventTimeSchema,
  locationLabel: z.string().min(2).max(200),
  departmentCode: z.string().trim().max(20).nullable().optional(),
  departmentName: z.string().trim().max(120).nullable().optional(),
  departureLocationLabel: z.string().min(2).max(200).optional(),
  arrivalLocationLabel: z.string().min(2).max(200).optional(),
  routeStyle: z.enum(["direct", "souple"]).optional(),
  routeAdjustmentMessage: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  actionPhase: actionPhaseSchema.optional(),
  preparationData: preparationDataSchema.nullable().optional(),
  routeCalibrationContext: z.custom<RouteCalibrationContext>(
    isRouteCalibrationContext,
    "Contexte historique de calibration invalide.",
  ).nullable().optional(),
  wasteKg: wasteMassSchema.nullable().optional(),
  cigaretteButtsMeasurements: cigaretteButtsMeasurementsSchema,
  cigaretteButtsMassKg: z.number().min(0).max(100000).nullable().optional(),
  cigaretteButtsVolumeLiters: z.number().min(0).max(100000).nullable().optional(),
  cigaretteButtsCondition: z.enum(["propre", "humide", "mouille"]).nullable().optional(),
  cigaretteButtsKg: z.number().min(0).max(100000).nullable().optional(),
  cigaretteButts: z.number().int().min(0).max(MAX_CIGARETTE_BUTTS_COUNT).nullable().optional(),
  cigaretteButtsCount: z.number().int().min(0).max(MAX_CIGARETTE_BUTTS_COUNT).nullable().optional(),
  volunteerParticipation: volunteerParticipationSchema,
  volunteersCount: z.number().int().min(1).max(500).default(1),
  durationMinutes: z
    .number()
    .int()
    .min(0)
    .max(24 * 60)
    .default(0),
  notes: z.string().max(1000).optional(),
  manualDrawing: manualDrawingSchema.optional(),
  geometrySource: z.enum(ACTION_GEOMETRY_SOURCES).nullable().optional(),
  submissionMode: z.enum(["quick", "complete"]).optional(),
  wasteBreakdown: wasteBreakdownSchema.optional(),
  wasteMeasurementMethod: wasteMeasurementMethodSchema,
  photos: z.array(photoAssetSchema).max(3).optional(),
  visionEstimate: visionEstimateSchema.nullable().optional(),
  userMetadata: userMetadataSchema.optional(),
});

const createActionLegacySchema = createActionLegacyBaseSchema
  .extend({ plannerSnapshotProof: routePlannerProofSchema })
  .superRefine(
  addTemporalContractIssue,
);

const createActionContractSchema = z.object({
  type: z.enum(["action", "clean_place", "spot"]),
  source: z.string().min(1).max(80),
  location: z.object({
    label: z.string().min(2).max(200),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    departmentCode: z.string().trim().max(20).nullable().optional(),
    departmentName: z.string().trim().max(120).nullable().optional(),
  }),
  departureLocationLabel: z.string().min(2).max(200).optional(),
  arrivalLocationLabel: z.string().min(2).max(200).optional(),
  routeStyle: z.enum(["direct", "souple"]).optional(),
  routeAdjustmentMessage: z.string().max(500).optional(),
  geometry: contractGeometrySchema.optional(),
  dates: z.object({
    observedAt: z.string().date(),
    eventStartTime: eventTimeSchema,
    eventEndTime: eventTimeSchema,
  }),
    metadata: z.object({
    actorName: z.string().min(1).max(120).optional(),
    associationName: associationNameSchema,
    organizerType: organizerTypeSchema.nullable().optional(),
    organizerAccounts: z.array(z.string().min(1).max(120)).max(20).optional(),
    participantAccounts: accountTokensSchema,
    groupJoinEnabled: z.boolean().optional(),
    placeType: z.string().max(80).optional(),
      wasteKg: wasteMassSchema.nullable().optional(),
      cigaretteButtsMeasurements: cigaretteButtsMeasurementsSchema,
      cigaretteButtsMassKg: z.number().min(0).max(100000).nullable().optional(),
      cigaretteButtsVolumeLiters: z.number().min(0).max(100000).nullable().optional(),
      cigaretteButtsCondition: z.enum(["propre", "humide", "mouille"]).nullable().optional(),
      cigaretteButtsKg: z.number().min(0).max(100000).nullable().optional(),
      cigaretteButts: z.number().int().min(0).max(MAX_CIGARETTE_BUTTS_COUNT).nullable().optional(),
      volunteerParticipation: volunteerParticipationSchema,
    volunteersCount: z.number().int().min(1).max(500).optional(),
    durationMinutes: z
      .number()
      .int()
      .min(0)
      .max(24 * 60)
      .optional(),
    notes: z.string().max(1000).optional(),
    routeStyle: z.enum(["direct", "souple"]).optional(),
    routeAdjustmentMessage: z.string().max(500).optional(),
    submissionMode: z.enum(["quick", "complete"]).optional(),
    actionPhase: actionPhaseSchema.optional(),
    preparationData: preparationDataSchema.nullable().optional(),
    plannerSnapshotProof: routePlannerProofSchema,
      wasteBreakdown: wasteBreakdownSchema.optional(),
      wasteMeasurementMethod: wasteMeasurementMethodSchema,
    photos: z.array(photoAssetSchema).max(3).optional(),
    visionEstimate: visionEstimateSchema.nullable().optional(),
  }),
}).superRefine((value, ctx) =>
  addTemporalContractIssue(
    {
      durationMinutes: value.metadata.durationMinutes,
      eventStartTime: value.dates.eventStartTime,
      eventEndTime: value.dates.eventEndTime,
    },
    ctx,
  ),
);

export const createActionSchema = z
  .union([createActionLegacySchema, createActionContractSchema])
  .transform(
    (value): CreateActionPayload =>
      normalizeCreatePayload(
        value as CreateActionPayload | ActionContractCreatePayload,
      ),
  );

export const updateActionSchema = createActionLegacyBaseSchema
  .partial()
  .extend({
  actionPhase: actionPhaseSchema.optional(),
  preparationData: preparationDataSchema.nullable().optional(),
  reason: z.string().trim().max(500).optional(),
  })
  .superRefine(addTemporalContractIssue);

export type CreateActionInput = z.infer<typeof createActionSchema>;

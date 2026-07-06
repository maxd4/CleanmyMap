import { z } from "zod";
import {
  normalizeCreatePayload,
  type ActionContractCreatePayload,
} from "@/lib/actions/data-contract";
import { isValidAssociationName } from "@/lib/actions/association-options";
import type { CreateActionPayload } from "@/lib/actions/types";

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

const wasteBreakdownSchema = z.object({
  megotsKg: z.number().min(0).max(100000).optional(),
  megotsCondition: z.enum(["propre", "humide", "mouille"]).optional(),
  plastiqueKg: z.number().min(0).max(100000).optional(),
  verreKg: z.number().min(0).max(100000).optional(),
  metalKg: z.number().min(0).max(100000).optional(),
  mixteKg: z.number().min(0).max(100000).optional(),
  triQuality: z.enum(["faible", "moyenne", "elevee"]).optional(),
});

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
    logisticsNotes: z.string().max(2000).optional(),
    checklistBeforeDeparture: z.string().max(2000).optional(),
    volunteersExpected: z.number().int().min(0).max(500).optional(),
    groupJoinEnabled: z.boolean().optional(),
  })
  .strict();

const actionPhaseSchema = z.enum([
  "pre_action",
  "post_action_draft",
  "post_action_complete",
]);

const userMetadataSchema = z.object({
  userId: z.string().min(1).max(120),
  username: z.string().min(1).max(120).optional(),
  displayName: z.string().min(1).max(200).optional(),
  email: z.string().email().max(200).optional(),
});

const createActionLegacySchema = z.object({
  actorName: z.string().min(1).max(120).optional(),
  associationName: associationNameSchema,
  organizerAccounts: z.array(z.string().min(1).max(120)).max(20).optional(),
  groupJoinEnabled: z.boolean().optional(),
  recordType: z.enum(["action", "clean_place", "spot"]).optional(),
  placeType: z.string().max(80).optional(),
  actionDate: z.string().date(),
  locationLabel: z.string().min(2).max(200),
  departureLocationLabel: z.string().min(2).max(200).optional(),
  arrivalLocationLabel: z.string().min(2).max(200).optional(),
  routeStyle: z.enum(["direct", "souple"]).optional(),
  routeAdjustmentMessage: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  actionPhase: actionPhaseSchema.optional(),
  preparationData: preparationDataSchema.nullable().optional(),
  wasteKg: z.number().min(0).max(100000),
  cigaretteButts: z.number().int().min(0).max(5000000).default(0),
  cigaretteButtsCount: z.number().int().min(1).max(10000).optional(),
  volunteersCount: z.number().int().min(1).max(500).default(1),
  durationMinutes: z
    .number()
    .int()
    .min(0)
    .max(24 * 60)
    .default(0),
  notes: z.string().max(1000).optional(),
  manualDrawing: manualDrawingSchema.optional(),
  submissionMode: z.enum(["quick", "complete"]).optional(),
  wasteBreakdown: wasteBreakdownSchema.optional(),
  photos: z.array(photoAssetSchema).max(3).optional(),
  visionEstimate: visionEstimateSchema.nullable().optional(),
  userMetadata: userMetadataSchema.optional(),
});

const createActionContractSchema = z.object({
  type: z.enum(["action", "clean_place", "spot"]),
  source: z.string().min(1).max(80),
  location: z.object({
    label: z.string().min(2).max(200),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  }),
  departureLocationLabel: z.string().min(2).max(200).optional(),
  arrivalLocationLabel: z.string().min(2).max(200).optional(),
  routeStyle: z.enum(["direct", "souple"]).optional(),
  routeAdjustmentMessage: z.string().max(500).optional(),
  geometry: manualDrawingSchema.optional(),
  dates: z.object({
    observedAt: z.string().date(),
  }),
  metadata: z.object({
    actorName: z.string().min(1).max(120).optional(),
    associationName: associationNameSchema,
    organizerAccounts: z.array(z.string().min(1).max(120)).max(20).optional(),
    groupJoinEnabled: z.boolean().optional(),
    placeType: z.string().max(80).optional(),
    wasteKg: z.number().min(0).max(100000),
    cigaretteButts: z.number().int().min(0).max(5000000).optional(),
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
    wasteBreakdown: wasteBreakdownSchema.optional(),
    photos: z.array(photoAssetSchema).max(3).optional(),
    visionEstimate: visionEstimateSchema.nullable().optional(),
  }),
});

export const createActionSchema = z
  .union([createActionLegacySchema, createActionContractSchema])
  .transform(
    (value): CreateActionPayload =>
      normalizeCreatePayload(
        value as CreateActionPayload | ActionContractCreatePayload,
      ),
  );

export const updateActionSchema = createActionLegacySchema.partial().extend({
  actionPhase: actionPhaseSchema.optional(),
  preparationData: preparationDataSchema.nullable().optional(),
});

export type CreateActionInput = z.infer<typeof createActionSchema>;

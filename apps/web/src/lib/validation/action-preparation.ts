import { z } from "zod";
import { isRouteCalibrationContext } from "@/lib/route/route-calibration";
import type { RouteCalibrationContext } from "@/lib/route/route-calibration";
import {
  isLegacyActualRoute,
  isOperationalRoute,
  normalizeOperationalRoute,
} from "@/lib/route/route-operational";
import type { OperationalRoute } from "@/lib/route/route-operational";
import {
  gpxImportMetadataSchema,
  locationCoordinatesSchema,
} from "./action-geometry";
import {
  volunteerParticipationSchema,
  wasteCategorySlugSchema,
} from "./action-measurements";
import { preparationFormalitiesSchemaFields } from "./action-formalities";
import {
  ACTION_ACCESSIBILITY_STATUSES,
  ACTION_MATERIAL_SUGGESTIONS,
  isActionMaterialSuggestion,
} from "@/lib/actions/preparation-contract";
import type { ActionMaterialSuggestion } from "@/lib/actions/preparation-contract";

export const routeCalibrationContextSchema = z.custom<RouteCalibrationContext>(
  isRouteCalibrationContext,
  "Contexte historique de calibration invalide.",
);

const accessibilityStatusSchema = z.enum(ACTION_ACCESSIBILITY_STATUSES);
const materialSuggestionSchema = z.custom<ActionMaterialSuggestion>(
  isActionMaterialSuggestion,
  "Suggestion de matériel inconnue.",
);
const preparationChecklistItemSchema = z.object({
  key: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(120),
  checked: z.boolean(),
}).strict();
const preparationChecklistSchema = z.array(preparationChecklistItemSchema).max(12).superRefine((items, ctx) => {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (seen.has(item.key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, "key"],
        message: "Les identifiants de checklist doivent être uniques.",
      });
    }
    seen.add(item.key);
  });
});

export const preparationDataSchema = z
  .object({
    actionTitle: z.string().max(200).optional(),
    shortDescription: z.string().max(1000).optional(),
    communeZoneLabel: z.string().max(200).optional(),
    pointDeRendezVous: z.string().max(200).optional(),
    zoneCiblePrevue: z.string().max(200).optional(),
    actionDate: z.string().date().optional(),
    meetingTime: z.string().max(20).optional(),
    departureTime: z.string().max(20).optional(),
    durationMinutesDeclared: z.boolean().optional(),
    estimatedDurationMinutes: z.number().int().min(0).max(24 * 60).optional(),
    routeTargetDistanceKm: z.number().min(0).max(100).optional(),
    routeTargetDistanceSource: z.enum(["derived", "manual"]).optional(),
    routeTargetDistancePolicyVersion: z.string().min(1).max(64).optional(),
    midRouteCoordinates: locationCoordinatesSchema.optional(),
    arrivalCoordinates: locationCoordinatesSchema.optional(),
    routeObservedDistanceKm: z.number().finite().min(0).max(1000).optional(),
    gpxImport: gpxImportMetadataSchema.optional(),
    routeNetworkDistanceKm: z.number().min(0).max(1000).optional(),
    routeGeometryMode: z.enum(["network", "fallback"]).optional(),
    routeGeometryProvider: z.enum(["osrm", "fossgis-osrm", "none"]).optional(),
    plannedObjective: z
      .enum(["repérage", "nettoyage", "collecte_mégots", "action_mixte", "sensibilisation", "autre"])
      .optional(),
    placeType: z.string().max(120).optional(),
    estimatedDifficulty: z.enum(["facile", "moderee", "soutenue"]).optional(),
    accessibility: z.string().max(1000).optional(),
    accessibilityStatus: accessibilityStatusSchema.optional(),
    safetyInstructions: z.string().max(2000).optional(),
    recommendedMaterials: z.string().max(2000).optional(),
    materialsProvided: z.string().max(2000).optional(),
    suggestedMaterials: z.array(materialSuggestionSchema).max(ACTION_MATERIAL_SUGGESTIONS.length).optional(),
    participantMessage: z.string().max(2000).optional(),
    ...preparationFormalitiesSchemaFields,
    logisticsNotes: z.string().max(2000).optional(),
    preparationChecklist: preparationChecklistSchema.optional(),
    checklistBeforeDeparture: z.string().max(2000).optional(),
    volunteersExpected: z.number().int().min(0).max(500).optional(),
    volunteerParticipation: volunteerParticipationSchema,
    groupJoinEnabled: z.boolean().optional(),
    expectedWasteCategories: z.array(wasteCategorySlugSchema).max(20).optional(),
    midRouteLocationLabel: z.string().max(200).optional(),
    routeTopology: z.enum(["loop", "point_to_point"]).optional(),
    routeCalibrationContext: routeCalibrationContextSchema.optional(),
    operationalRoute: z.custom<OperationalRoute>(
      isOperationalRoute,
      "Parcours opérationnel invalide.",
    ).optional(),
    actualRoute: z.custom(isLegacyActualRoute, "Ancien parcours invalide.").optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.routeTargetDistanceSource === "derived" &&
      !value.routeTargetDistancePolicyVersion
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["routeTargetDistancePolicyVersion"],
        message: "Une cible dérivée doit porter la version de sa policy.",
      });
    }
    if (
      value.routeTargetDistanceSource === "manual" &&
      value.routeTargetDistancePolicyVersion !== undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["routeTargetDistancePolicyVersion"],
        message: "Une cible manuelle ne doit pas porter de version de policy.",
      });
    }
  })
  .transform(({ actualRoute, operationalRoute, ...rest }) => {
    delete rest.administrativeRequirements;
    delete rest.formalitiesWorkflow;
    return {
      ...rest,
      ...(operationalRoute
        ? { operationalRoute }
        : actualRoute
          ? { operationalRoute: normalizeOperationalRoute(actualRoute)! }
          : {}),
    };
  });

import { z } from "zod";
import {
  normalizeCreatePayload,
  type ActionContractCreatePayload,
} from "@/lib/actions/data-contract";
import type { CreateActionPayload } from "@/lib/actions/types";
import { getTimeContractValidationMessage, isValidClockTime } from "@/lib/actions/time-contract";
import { MAX_CIGARETTE_BUTTS_COUNT } from "@/lib/waste/cigarette-butts";
import {
  actionInputGeometrySourceSchema,
  addGpxImportIssue,
  addRouteTopologyIssue,
  commonActionRouteSchemaFields,
  contractGeometrySchema,
  manualDrawingSchema,
  routePlannerProofSchema,
} from "./action-geometry";
import {
  commonActionMeasurementSchemaFields,
  visionEstimateSchema,
  volunteerParticipationSchema,
  wasteBreakdownSchema,
  wasteMeasurementMethodSchema,
} from "./action-measurements";
import { commonActionIdentitySchemaFields, userMetadataSchema } from "./action-identity";
import { photoAssetSchema } from "./action-media";
import { preparationDataSchema } from "./action-preparation";

export { commonActionCigaretteButtSchemaFields } from "./action-measurements";
export { manualDrawingSchema } from "./action-geometry";

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
  ...commonActionIdentitySchemaFields,
  recordType: z.enum(["action", "clean_place", "spot"]).optional(),
  placeType: z.string().max(80).optional(),
  actionDate: z.string().date(),
  eventStartTime: eventTimeSchema,
  eventEndTime: eventTimeSchema,
  locationLabel: z.string().min(2).max(200),
  departmentCode: z.string().trim().max(20).nullable().optional(),
  departmentName: z.string().trim().max(120).nullable().optional(),
  ...commonActionRouteSchemaFields,
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  actionPhase: actionPhaseSchema.optional(),
  preparationData: preparationDataSchema.nullable().optional(),
  ...commonActionMeasurementSchemaFields,
  cigaretteButtsCount: z.number().int().min(0).max(MAX_CIGARETTE_BUTTS_COUNT).nullable().optional(),
  volunteerParticipation: volunteerParticipationSchema,
  volunteersCount: z.number().int().min(1).max(500).default(1),
  durationMinutes: z.number().int().min(0).max(24 * 60).default(0),
  notes: z.string().max(1000).optional(),
  manualDrawing: manualDrawingSchema.optional(),
  geometrySource: actionInputGeometrySourceSchema.nullable().optional(),
  submissionMode: z.enum(["quick", "complete"]).optional(),
  wasteBreakdown: wasteBreakdownSchema.optional(),
  wasteMeasurementMethod: wasteMeasurementMethodSchema,
  photos: z.array(photoAssetSchema).max(3).optional(),
  visionEstimate: visionEstimateSchema.nullable().optional(),
  userMetadata: userMetadataSchema.optional(),
});

const createActionLegacySchema = createActionLegacyBaseSchema
  .extend({ plannerSnapshotProof: routePlannerProofSchema })
  .superRefine((value, ctx) => {
    addTemporalContractIssue(value, ctx);
    addRouteTopologyIssue(value, ctx);
    addGpxImportIssue(value, ctx);
  });

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
  ...commonActionRouteSchemaFields,
  geometry: contractGeometrySchema.optional(),
  dates: z.object({
    observedAt: z.string().date(),
    eventStartTime: eventTimeSchema,
    eventEndTime: eventTimeSchema,
  }),
  metadata: z.object({
    ...commonActionIdentitySchemaFields,
    placeType: z.string().max(80).optional(),
    ...commonActionMeasurementSchemaFields,
    volunteerParticipation: volunteerParticipationSchema,
    volunteersCount: z.number().int().min(1).max(500).optional(),
    durationMinutes: z.number().int().min(0).max(24 * 60).optional(),
    notes: z.string().max(1000).optional(),
    routeStyle: z.enum(["direct", "souple"]).optional(),
    routeTopology: z.enum(["loop", "point_to_point"]).optional(),
    routeAdjustmentMessage: z.string().max(500).optional(),
    departureLocationLabel: z.string().min(2).max(200).optional(),
    arrivalLocationLabel: z.string().min(2).max(200).optional(),
    submissionMode: z.enum(["quick", "complete"]).optional(),
    actionPhase: actionPhaseSchema.optional(),
    preparationData: preparationDataSchema.nullable().optional(),
    plannerSnapshotProof: routePlannerProofSchema,
    wasteBreakdown: wasteBreakdownSchema.optional(),
    wasteMeasurementMethod: wasteMeasurementMethodSchema,
    photos: z.array(photoAssetSchema).max(3).optional(),
    visionEstimate: visionEstimateSchema.nullable().optional(),
  }),
}).superRefine((value, ctx) => {
  addTemporalContractIssue({
    durationMinutes: value.metadata.durationMinutes,
    eventStartTime: value.dates.eventStartTime,
    eventEndTime: value.dates.eventEndTime,
  }, ctx);
  addRouteTopologyIssue({
    routeTopology: value.routeTopology ?? value.metadata.routeTopology,
    arrivalLocationLabel: value.arrivalLocationLabel ?? value.metadata.arrivalLocationLabel,
    recordType: value.type,
  }, ctx);
  addGpxImportIssue({
    geometrySource: value.geometry?.geometrySource,
    manualDrawing: value.geometry,
    preparationData: value.metadata.preparationData,
    routeTopology: value.routeTopology ?? value.metadata.routeTopology,
    arrivalLocationLabel: value.arrivalLocationLabel ?? value.metadata.arrivalLocationLabel,
    recordType: value.type,
  }, ctx);
});

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
    geometrySource: actionInputGeometrySourceSchema
      .or(z.literal("gps_tracking"))
      .nullable()
      .optional(),
    organizerId: z.string().trim().min(1).max(120).nullable().optional(),
    organizerName: z.string().trim().min(1).max(120).optional(),
    actionPhase: actionPhaseSchema.optional(),
    preparationData: preparationDataSchema.nullable().optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .superRefine(addTemporalContractIssue);

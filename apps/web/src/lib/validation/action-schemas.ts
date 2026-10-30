import { z } from "zod";
import {
  normalizeCreatePayload,
  type ActionContractCreatePayload,
} from "@/lib/actions/data-contract";
import type { CreateActionPayload } from "@/lib/actions/types";
import { getVolunteerForecastValidationMessage } from "@/lib/actions/volunteer-participation";
import { getTimeContractValidationIssues, isValidClockTime } from "@/lib/actions/time-contract";
import { isActionDateInFuture } from "@/lib/actions/temporal";
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
  actionMeasurementSchemaFields,
  visionEstimateSchema,
  volunteerParticipationSchema,
} from "./action-measurements";
import { commonActionIdentitySchemaFields, userMetadataSchema } from "./action-identity";
import { photoAssetSchema } from "./action-media";
import {
  preparationDataSchema,
  routeCalibrationContextSchema,
} from "./action-preparation";

const actionPhaseSchema = z.enum([
  "pre_action",
  "post_action_draft",
  "post_action_complete",
]);
const actionContextSchema = z.enum(["citizen", "company", "school"]);

const eventTimeSchema = z
  .string()
  .trim()
  .refine(isValidClockTime, "L’heure doit respecter le format HH:MM.")
  .nullable()
  .optional();

function addTemporalContractIssue(
  value: {
    durationMinutes?: number | null;
    eventStartTime?: string | null;
    eventEndTime?: string | null;
    preparationData?: {
      meetingTime?: string;
      departureTime?: string;
    } | null;
  },
  ctx: z.RefinementCtx,
  preparationPath: readonly (string | number)[] = ["preparationData"],
) {
  const issues = getTimeContractValidationIssues({
    actionDurationMinutes: value.durationMinutes,
    startTime: value.eventStartTime,
    endTime: value.eventEndTime,
    meetingTime: value.preparationData?.meetingTime,
    departureTime: value.preparationData?.departureTime,
  });
  for (const issue of issues) {
    const path = issue.field === "meetingTime" || issue.field === "departureTime"
      ? [...preparationPath, issue.field]
      : [issue.field];
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: issue.message,
    });
  }
}

function addCompletedActionFutureDateIssue(
  value: { actionDate?: string; actionPhase?: string; submissionMode?: string },
  ctx: z.RefinementCtx,
  path: (string | number)[] = ["actionDate"],
) {
  if (
    (value.actionPhase === "post_action_complete" || value.submissionMode === "complete") &&
    isActionDateInFuture(value.actionDate)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: "Une déclaration finale doit concerner une date déjà passée ou aujourd’hui.",
    });
  }
}

function addPreActionVolunteerForecastIssue(
  value: {
    actionPhase?: string;
    submissionMode?: string;
    preparationData?: {
      volunteersExpected?: number;
      volunteerParticipation?: {
        childrenCount?: number | null;
        adultCount?: number | null;
        retiredCount?: number | null;
      } | null;
    } | null;
  },
  ctx: z.RefinementCtx,
) {
  if (
    value.actionPhase !== "pre_action" ||
    value.submissionMode !== "quick" ||
    value.preparationData === undefined ||
    value.preparationData === null
  ) {
    return;
  }

  const message = getVolunteerForecastValidationMessage({
    volunteersExpected: value.preparationData.volunteersExpected,
    volunteerParticipation: value.preparationData.volunteerParticipation,
  });
  if (message) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["preparationData", "volunteersExpected"],
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
  actionContext: actionContextSchema.nullable().optional(),
  schoolContextConfirmed: z.boolean().optional(),
  accessMode: z.enum(["public", "invite_link"]).optional(),
  preparationData: preparationDataSchema.nullable().optional(),
  routeCalibrationContext: routeCalibrationContextSchema.nullable().optional(),
  ...actionMeasurementSchemaFields,
  volunteerParticipation: volunteerParticipationSchema,
  volunteersCount: z.number().int().min(0).max(500).default(1),
  durationMinutes: z.number().int().min(0).max(24 * 60).default(0),
  notes: z.string().max(1000).optional(),
  manualDrawing: manualDrawingSchema.optional(),
  geometrySource: actionInputGeometrySourceSchema.nullable().optional(),
  submissionMode: z.enum(["quick", "complete"]).optional(),
  photos: z.array(photoAssetSchema).max(3).optional(),
  visionEstimate: visionEstimateSchema.nullable().optional(),
  userMetadata: userMetadataSchema.optional(),
});

const createActionLegacySchema = createActionLegacyBaseSchema
  .extend({ plannerSnapshotProof: routePlannerProofSchema })
  .superRefine((value, ctx) => {
    addCompletedActionFutureDateIssue(value, ctx);
    addTemporalContractIssue(value, ctx);
    addRouteTopologyIssue(value, ctx);
    addGpxImportIssue(value, ctx);
    addPreActionVolunteerForecastIssue(value, ctx);
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
    ...actionMeasurementSchemaFields,
    volunteerParticipation: volunteerParticipationSchema,
    volunteersCount: z.number().int().min(0).max(500).optional(),
    durationMinutes: z.number().int().min(0).max(24 * 60).optional(),
    notes: z.string().max(1000).optional(),
    routeStyle: z.enum(["direct", "souple"]).optional(),
    routeTopology: z.enum(["loop", "point_to_point"]).optional(),
    routeAdjustmentMessage: z.string().max(500).optional(),
    departureLocationLabel: z.string().min(2).max(200).optional(),
    arrivalLocationLabel: z.string().min(2).max(200).optional(),
    submissionMode: z.enum(["quick", "complete"]).optional(),
    actionPhase: actionPhaseSchema.optional(),
    actionContext: actionContextSchema.nullable().optional(),
    schoolContextConfirmed: z.boolean().optional(),
    accessMode: z.enum(["public", "invite_link"]).optional(),
    preparationData: preparationDataSchema.nullable().optional(),
    plannerSnapshotProof: routePlannerProofSchema,
    photos: z.array(photoAssetSchema).max(3).optional(),
    visionEstimate: visionEstimateSchema.nullable().optional(),
  }),
}).superRefine((value, ctx) => {
  addCompletedActionFutureDateIssue({
    actionDate: value.dates.observedAt,
    actionPhase: value.metadata.actionPhase,
    submissionMode: value.metadata.submissionMode,
  }, ctx, ["dates", "observedAt"]);
  addTemporalContractIssue({
    durationMinutes: value.metadata.durationMinutes,
    eventStartTime: value.dates.eventStartTime,
    eventEndTime: value.dates.eventEndTime,
    preparationData: value.metadata.preparationData,
  }, ctx, ["metadata", "preparationData"]);
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
  addPreActionVolunteerForecastIssue({
    actionPhase: value.metadata.actionPhase,
    submissionMode: value.metadata.submissionMode,
    preparationData: value.metadata.preparationData,
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
    // Create-only defaults must not appear on partial updates: omission means
    // "leave the stored value unchanged", not a new participant or duration.
    volunteersCount: z.number().int().min(0).max(500).optional(),
    durationMinutes: z.number().int().min(0).max(24 * 60).optional(),
    accessMode: z.enum(["public", "invite_link"]).optional(),
    preparationData: preparationDataSchema.nullable().optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    addCompletedActionFutureDateIssue(value, ctx);
    addTemporalContractIssue(value, ctx);
    addPreActionVolunteerForecastIssue(value, ctx);
  });

import { z } from "zod";
import {
  normalizeCreatePayload,
  type ActionContractCreatePayload,
} from "@/lib/actions/data-contract";
import type { CreateActionPayload } from "@/lib/actions/types";
import { getCollectorsCountValidationMessage, getVolunteerForecastValidationMessage } from "@/lib/actions/volunteer-participation";
import { getTimeContractValidationIssues, isValidClockTime } from "@/lib/actions/time-contract";
import { isActionDateInFuture, resolveActionTemporalInstants } from "@/lib/actions/temporal";
import { isValidIanaTimeZone } from "@/lib/time/civil-date";
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
import { compareWasteCharacterizationToTotal } from "@/lib/waste";
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
const organizationLinkSchema = z.object({
  organizationId: z.string().uuid(),
  siteId: z.string().uuid().nullable(),
}).strict();

function addButtsConditionIssue(value: unknown, ctx: z.RefinementCtx) {
  if (!value || typeof value !== "object") return;
  const root = value as Record<string, unknown>;
  const metadata = (root.metadata && typeof root.metadata === "object"
    ? root.metadata
    : root) as Record<string, unknown>;
  const measurements = metadata.cigaretteButtsMeasurements &&
      typeof metadata.cigaretteButtsMeasurements === "object"
    ? metadata.cigaretteButtsMeasurements as Record<string, unknown>
    : {};
  const lots = measurements.cigaretteButtsLots ?? metadata.cigaretteButtsLots ?? root.cigaretteButtsLots;
  if (Array.isArray(lots) && lots.length > 0) return;

  const count = measurements.cigaretteButtsCount ?? metadata.cigaretteButtsCount ?? root.cigaretteButtsCount ?? root.cigaretteButts;
  const mass = measurements.cigaretteButtsMassKg ?? metadata.cigaretteButtsMassKg ?? root.cigaretteButtsMassKg ?? root.cigaretteButtsKg;
  const volume = measurements.cigaretteButtsVolumeLiters ?? metadata.cigaretteButtsVolumeLiters ?? root.cigaretteButtsVolumeLiters;
  const enteredMeasurementCount = [count, mass, volume].filter(
    (entry) => entry !== null && entry !== undefined,
  ).length;
  const source = measurements.cigaretteButtsInputSource;
  const condition = measurements.cigaretteButtsCondition ?? metadata.cigaretteButtsCondition ?? root.cigaretteButtsCondition;
  const hasPositiveMeasurement = [count, mass, volume].some(
    (entry) => typeof entry === "number" && entry > 0,
  );
  const hasConvertibleSource = hasPositiveMeasurement && (
    enteredMeasurementCount === 1 ||
    source === "count" || source === "mass" || source === "mass_kg" || source === "volume_l"
  );
  if (hasConvertibleSource && condition == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: measurements.cigaretteButtsCondition !== undefined
        ? ["cigaretteButtsMeasurements", "cigaretteButtsCondition"]
        : ["cigaretteButtsCondition"],
      message: "Choisissez l’état des mégots pour calculer leurs équivalents.",
    });
  }
}

const eventTimeSchema = z
  .string()
  .trim()
  .refine(isValidClockTime, "L’heure doit respecter le format HH:MM.")
  .nullable()
  .optional();

const actionTimezoneSchema = z
  .string()
  .trim()
  .max(100)
  .refine(isValidIanaTimeZone, "Le fuseau doit être un identifiant IANA valide.")
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
  value: { actionDate?: string; actionTimezone?: string | null; actionPhase?: string; submissionMode?: string },
  ctx: z.RefinementCtx,
  path: (string | number)[] = ["actionDate"],
) {
  if (
    (value.actionPhase === "post_action_complete" || value.submissionMode === "complete") &&
    isActionDateInFuture(value.actionDate, new Date(), value.actionTimezone ?? undefined)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: "Une déclaration finale doit concerner une date déjà passée ou aujourd’hui.",
    });
  }
}

function addActionTemporalIssue(
  value: {
    actionDate: string;
    actionTimezone?: string | null;
    eventStartTime?: string | null;
    eventEndTime?: string | null;
  },
  ctx: z.RefinementCtx,
  path: (string | number)[],
) {
  try {
    resolveActionTemporalInstants(value);
  } catch (error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: error instanceof Error ? error.message : "Les horaires locaux sont invalides pour ce fuseau.",
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

function addWasteCharacterizationCoherenceIssue(
  value: {
    wasteKg?: number | null;
    wasteBreakdown?: { characterizationKg?: Record<string, number | null> };
  },
  ctx: z.RefinementCtx,
  path: (string | number)[] = ["wasteBreakdown", "characterizationKg"],
) {
  const comparison = compareWasteCharacterizationToTotal(
    value.wasteKg,
    value.wasteBreakdown?.characterizationKg,
  );
  if (comparison.status === "warning") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: "La somme des masses caractérisées ne peut pas dépasser la masse totale collectée.",
    });
  }
}

const createActionLegacyBaseSchema = z.object({
  organizationLink: organizationLinkSchema.optional(),
  ...commonActionIdentitySchemaFields,
  recordType: z.enum(["action", "clean_place", "spot"]).optional(),
  placeType: z.string().max(80).optional(),
  actionDate: z.string().date(),
  actionTimezone: actionTimezoneSchema,
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
  collectorsCount: z.number().int().min(0).max(500).nullable().optional(),
  collectorsCountProvenance: z.enum(["participant_total_default", "user_confirmed", "historical_default_accepted"]).optional(),
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
    addActionTemporalIssue(value, ctx, ["actionDate"]);
    addTemporalContractIssue(value, ctx);
    addRouteTopologyIssue(value, ctx);
    addGpxImportIssue(value, ctx);
    addPreActionVolunteerForecastIssue(value, ctx);
    addWasteCharacterizationCoherenceIssue(value, ctx);
    const collectorsCountMessage = getCollectorsCountValidationMessage({ collectorsCount: value.collectorsCount, volunteersCount: value.volunteersCount });
    if (collectorsCountMessage) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["collectorsCount"], message: collectorsCountMessage });
    }
    if ((value.collectorsCountProvenance === "participant_total_default" || value.collectorsCountProvenance === "historical_default_accepted") && value.collectorsCount !== value.volunteersCount) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["collectorsCountProvenance"], message: "Une valeur préremplie doit correspondre au total déclaré." });
    }
  });

const createActionContractSchema = z.object({
  organizationLink: organizationLinkSchema.optional(),
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
    actionTimezone: actionTimezoneSchema,
    eventStartTime: eventTimeSchema,
    eventEndTime: eventTimeSchema,
  }),
  metadata: z.object({
    ...commonActionIdentitySchemaFields,
    placeType: z.string().max(80).optional(),
    ...actionMeasurementSchemaFields,
    volunteerParticipation: volunteerParticipationSchema,
    volunteersCount: z.number().int().min(0).max(500).optional(),
    collectorsCount: z.number().int().min(0).max(500).nullable().optional(),
    collectorsCountProvenance: z.enum(["participant_total_default", "user_confirmed", "historical_default_accepted"]).optional(),
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
    actionTimezone: value.dates.actionTimezone,
    actionPhase: value.metadata.actionPhase,
    submissionMode: value.metadata.submissionMode,
  }, ctx, ["dates", "observedAt"]);
  addActionTemporalIssue({
    actionDate: value.dates.observedAt,
    actionTimezone: value.dates.actionTimezone,
    eventStartTime: value.dates.eventStartTime,
    eventEndTime: value.dates.eventEndTime,
  }, ctx, ["dates", "actionTimezone"]);
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
  addWasteCharacterizationCoherenceIssue(
    {
      wasteKg: value.metadata.wasteKg,
      wasteBreakdown: value.metadata.wasteBreakdown,
    },
    ctx,
    ["metadata", "wasteBreakdown", "characterizationKg"],
  );
});

export const createActionSchema = z
  .union([createActionLegacySchema, createActionContractSchema])
  .superRefine(addButtsConditionIssue)
  .transform(
    (value): CreateActionPayload => ({
      ...normalizeCreatePayload(value as CreateActionPayload | ActionContractCreatePayload),
      ...("organizationLink" in value && value.organizationLink ? { organizationLink: value.organizationLink } : {}),
    }),
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
    collectorsCount: z.number().int().min(0).max(500).nullable().optional(),
    durationMinutes: z.number().int().min(0).max(24 * 60).optional(),
    accessMode: z.enum(["public", "invite_link"]).optional(),
    preparationData: preparationDataSchema.nullable().optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    addButtsConditionIssue(value, ctx);
    addCompletedActionFutureDateIssue(value, ctx);
    addTemporalContractIssue(value, ctx);
    addPreActionVolunteerForecastIssue(value, ctx);
    const collectorsCountMessage = getCollectorsCountValidationMessage({ collectorsCount: value.collectorsCount, volunteersCount: value.volunteersCount });
    if (collectorsCountMessage) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["collectorsCount"], message: collectorsCountMessage });
    }
    if ((value.collectorsCountProvenance === "participant_total_default" || value.collectorsCountProvenance === "historical_default_accepted") && value.collectorsCount !== undefined && value.collectorsCount !== null && value.volunteersCount !== undefined && value.collectorsCount !== value.volunteersCount) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["collectorsCountProvenance"], message: "Une valeur préremplie doit correspondre au total déclaré." });
    }
  });

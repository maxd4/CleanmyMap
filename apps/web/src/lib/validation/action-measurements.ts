import { z } from "zod";
import { normalizeVolunteerParticipation } from "@/lib/actions/volunteer-participation";
import { isWasteCategorySlug } from "@/lib/waste";
import {
  isAlignedToWasteMassResolution,
  ACTION_WASTE_MASS_RESOLUTION_KG,
  ACTION_WASTE_MEASUREMENT_METHODS,
} from "@/lib/waste/measurement";
import { MAX_CIGARETTE_BUTTS_COUNT } from "@/lib/waste/cigarette-butts";

const wasteMassSchema = z
  .number()
  .min(0)
  .max(100000)
  .refine(
    (value) => isAlignedToWasteMassResolution(value, ACTION_WASTE_MASS_RESOLUTION_KG),
    "La masse doit respecter une résolution de 0,1 kg.",
  );

export const wasteBreakdownSchema = z.object({
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

export const wasteMeasurementMethodSchema = z
  .enum(ACTION_WASTE_MEASUREMENT_METHODS)
  .nullable()
  .optional();

const cigaretteButtsMeasurementsSchema = z
  .object({
    // Server assigns provenance and formula versions.
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

export const commonActionCigaretteButtSchemaFields = {
  cigaretteButtsMassKg: z.number().min(0).max(100000).nullable().optional(),
  cigaretteButtsVolumeLiters: z.number().min(0).max(100000).nullable().optional(),
  cigaretteButtsCondition: z.enum(["propre", "humide", "mouille"]).nullable().optional(),
  cigaretteButtsKg: z.number().min(0).max(100000).nullable().optional(),
  cigaretteButts: z.number().int().min(0).max(MAX_CIGARETTE_BUTTS_COUNT).nullable().optional(),
};

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

export const volunteerParticipationSchema = volunteerParticipationInputSchema
  .nullable()
  .transform((value) =>
    value === null ? value : normalizeVolunteerParticipation(value),
  )
  .optional();

export const visionEstimateSchema = z.object({
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

export const commonActionMeasurementSchemaFields = {
  wasteKg: wasteMassSchema.nullable().optional(),
  cigaretteButtsMeasurements: cigaretteButtsMeasurementsSchema,
  ...commonActionCigaretteButtSchemaFields,
};

export const wasteCategorySlugSchema = z
  .string()
  .refine(isWasteCategorySlug, "Catégorie de déchet inconnue.");

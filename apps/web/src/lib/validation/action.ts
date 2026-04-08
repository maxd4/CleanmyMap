import { z } from "zod";
import { normalizeCreatePayload, type ActionContractCreatePayload } from "@/lib/actions/data-contract";
import type { CreateActionPayload } from "@/lib/actions/types";

const coordinateSchema = z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]);

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
        message: value.kind === "polygon" ? "Le polygone doit contenir au moins 3 points." : "Le trace doit contenir au moins 2 points.",
      });
    }
  });

const createActionLegacySchema = z.object({
  actorName: z.string().min(1).max(120).optional(),
  actionDate: z.string().date(),
  locationLabel: z.string().min(2).max(200),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  wasteKg: z.number().min(0).max(100000),
  cigaretteButts: z.number().int().min(0).max(5000000).default(0),
  volunteersCount: z.number().int().min(1).max(500).default(1),
  durationMinutes: z.number().int().min(0).max(24 * 60).default(0),
  notes: z.string().max(1000).optional(),
  manualDrawing: manualDrawingSchema.optional(),
});

const createActionContractSchema = z.object({
  type: z.literal("action"),
  source: z.string().min(1).max(80),
  location: z.object({
    label: z.string().min(2).max(200),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  }),
  geometry: manualDrawingSchema.optional(),
  dates: z.object({
    observedAt: z.string().date(),
  }),
  metadata: z.object({
    actorName: z.string().min(1).max(120).optional(),
    wasteKg: z.number().min(0).max(100000),
    cigaretteButts: z.number().int().min(0).max(5000000).optional(),
    volunteersCount: z.number().int().min(1).max(500).optional(),
    durationMinutes: z.number().int().min(0).max(24 * 60).optional(),
    notes: z.string().max(1000).optional(),
  }),
});

export const createActionSchema = z
  .union([createActionLegacySchema, createActionContractSchema])
  .transform((value): CreateActionPayload =>
    normalizeCreatePayload(value as CreateActionPayload | ActionContractCreatePayload),
  );

export type CreateActionInput = z.infer<typeof createActionSchema>;

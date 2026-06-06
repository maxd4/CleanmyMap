import { z } from "zod";
import { parseDrawingFromNotes } from "@/lib/actions/drawing";
import {
  buildPersistedGeometry,
  GEOMETRY_CONFIDENCE,
  toGeoJsonString,
} from "@/lib/actions/derived-geometry";
import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import { buildPersistedNotes } from "@/lib/actions/store";
import type { ActionDrawing, CreateActionPayload } from "@/lib/actions/types";
import type { getSupabaseServerClient } from "@/lib/supabase/server";
import { runSingleActionQuery } from "@/lib/actions/query";

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

const adminWasteBreakdownSchema = z.object({
  megotsKg: z.number().min(0).max(100000).optional(),
  megotsCondition: z.enum(["propre", "humide", "mouille"]).optional(),
  plastiqueKg: z.number().min(0).max(100000).optional(),
  verreKg: z.number().min(0).max(100000).optional(),
  metalKg: z.number().min(0).max(100000).optional(),
  mixteKg: z.number().min(0).max(100000).optional(),
  triQuality: z.enum(["faible", "moyenne", "elevee"]).optional(),
});

export const actionEditsSchema = z
  .object({
    actorName: z.string().trim().max(120).nullable().optional(),
    associationName: z.string().trim().max(120).nullable().optional(),
    actionDate: z.string().date().optional(),
    locationLabel: z.string().trim().min(2).max(200).optional(),
    departureLocationLabel: z.string().trim().max(200).nullable().optional(),
    arrivalLocationLabel: z.string().trim().max(200).nullable().optional(),
    routeStyle: z.enum(["direct", "souple"]).nullable().optional(),
    routeAdjustmentMessage: z.string().trim().max(500).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    wasteKg: z.number().min(0).max(100000).optional(),
    cigaretteButts: z.number().int().min(0).max(5000000).optional(),
    volunteersCount: z.number().int().min(1).max(500).optional(),
    durationMinutes: z.number().int().min(0).max(24 * 60).optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
    placeType: z.string().trim().max(80).nullable().optional(),
    submissionMode: z.enum(["quick", "complete"]).nullable().optional(),
    wasteBreakdown: adminWasteBreakdownSchema.nullable().optional(),
    manualDrawing: manualDrawingSchema.nullable().optional(),
  })
  .optional();

export const cleanPlaceEditsSchema = z
  .object({
    label: z.string().trim().min(2).max(200).optional(),
    wasteType: z.string().trim().max(80).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .optional();

type ExistingActionRow = {
  action_date: string;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  waste_kg: number | null;
  cigarette_butts: number | null;
  volunteers_count: number | null;
  duration_minutes: number | null;
  actor_name: string | null;
  notes: string | null;
};

type SupabaseServerClient = ReturnType<typeof getSupabaseServerClient>;

function cleanText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function nullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function loadExistingAction(
  supabase: SupabaseServerClient,
  id: string,
): Promise<ExistingActionRow> {
  const row = await runSingleActionQuery<ExistingActionRow>(supabase, (query) =>
    query
      .select(
        "action_date, location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count, duration_minutes, actor_name, notes",
      )
      .eq("id", id)
      .maybeSingle(),
  );

  if (!row) {
    throw new Error("Action not found");
  }
  return row;
}

export function buildAdminCleanPlaceUpdates(
  status: "new" | "validated" | "cleaned",
  edits?: z.infer<typeof cleanPlaceEditsSchema>,
) {
  return {
    status,
    ...(edits?.label !== undefined ? { label: edits.label } : {}),
    ...(edits?.wasteType !== undefined ? { waste_type: edits.wasteType } : {}),
    ...(edits?.latitude !== undefined ? { latitude: edits.latitude } : {}),
    ...(edits?.longitude !== undefined ? { longitude: edits.longitude } : {}),
    ...(edits?.notes !== undefined ? { notes: edits.notes } : {}),
  };
}

export async function buildAdminActionUpdates(
  supabase: SupabaseServerClient,
  id: string,
  status: "pending" | "approved" | "rejected",
  edits: NonNullable<z.infer<typeof actionEditsSchema>>,
) {
  const existing = await loadExistingAction(supabase, id);
  const parsedDrawing = parseDrawingFromNotes(existing.notes);
  const parsedMetadata = extractActionMetadataFromNotes(parsedDrawing.cleanNotes);
  const manualDrawing =
    edits.manualDrawing !== undefined
      ? edits.manualDrawing
      : parsedDrawing.manualDrawing;

  const payloadForNotes: CreateActionPayload = {
    actorName:
      edits.actorName !== undefined
        ? cleanText(edits.actorName)
        : cleanText(existing.actor_name),
    associationName:
      edits.associationName !== undefined
        ? cleanText(edits.associationName)
        : parsedMetadata.associationName ?? undefined,
    actionDate: edits.actionDate ?? existing.action_date,
    locationLabel: edits.locationLabel ?? existing.location_label,
    departureLocationLabel:
      edits.departureLocationLabel !== undefined
        ? cleanText(edits.departureLocationLabel)
        : parsedMetadata.departureLocationLabel ?? undefined,
    arrivalLocationLabel:
      edits.arrivalLocationLabel !== undefined
        ? cleanText(edits.arrivalLocationLabel)
        : parsedMetadata.arrivalLocationLabel ?? undefined,
    routeStyle:
      edits.routeStyle !== undefined
        ? edits.routeStyle ?? undefined
        : parsedMetadata.routeStyle ?? undefined,
    routeAdjustmentMessage:
      edits.routeAdjustmentMessage !== undefined
        ? cleanText(edits.routeAdjustmentMessage)
        : parsedMetadata.routeAdjustmentMessage ?? undefined,
    latitude: edits.latitude ?? existing.latitude ?? undefined,
    longitude: edits.longitude ?? existing.longitude ?? undefined,
    wasteKg: edits.wasteKg ?? Number(existing.waste_kg ?? 0),
    cigaretteButts: edits.cigaretteButts ?? Number(existing.cigarette_butts ?? 0),
    volunteersCount: edits.volunteersCount ?? Number(existing.volunteers_count ?? 1),
    durationMinutes: edits.durationMinutes ?? Number(existing.duration_minutes ?? 0),
    notes:
      edits.notes !== undefined
        ? cleanText(edits.notes)
        : parsedMetadata.cleanNotes ?? undefined,
    placeType:
      edits.placeType !== undefined
        ? cleanText(edits.placeType)
        : parsedMetadata.placeType ?? undefined,
    submissionMode:
      edits.submissionMode !== undefined
        ? edits.submissionMode ?? undefined
        : parsedMetadata.submissionMode ?? undefined,
    wasteBreakdown:
      edits.wasteBreakdown !== undefined
        ? edits.wasteBreakdown ?? undefined
        : parsedMetadata.wasteBreakdown ?? undefined,
    manualDrawing: manualDrawing ?? undefined,
    photos: parsedMetadata.photos as CreateActionPayload["photos"] | undefined,
    visionEstimate: parsedMetadata.visionEstimate ?? undefined,
  };

  const updates: Record<string, unknown> = {
    status,
    actor_name:
      edits.actorName !== undefined
        ? nullableText(edits.actorName)
        : nullableText(existing.actor_name),
    action_date: payloadForNotes.actionDate,
    location_label: payloadForNotes.locationLabel,
    latitude: edits.latitude !== undefined ? edits.latitude : existing.latitude,
    longitude: edits.longitude !== undefined ? edits.longitude : existing.longitude,
    waste_kg: payloadForNotes.wasteKg,
    cigarette_butts: payloadForNotes.cigaretteButts,
    volunteers_count: payloadForNotes.volunteersCount,
    duration_minutes: payloadForNotes.durationMinutes,
    notes: buildPersistedNotes(payloadForNotes),
  };

  if (edits.manualDrawing !== undefined) {
    const geometry = buildPersistedGeometry({
      drawing: manualDrawing as ActionDrawing | null,
      geojson: manualDrawing ? toGeoJsonString(manualDrawing) : null,
      confidence: manualDrawing
        ? GEOMETRY_CONFIDENCE.MANUAL_DRAWING
        : GEOMETRY_CONFIDENCE.POINT_FALLBACK,
      geometrySourceHint: manualDrawing ? "manual" : "fallback_point",
      latitude: payloadForNotes.latitude ?? null,
      longitude: payloadForNotes.longitude ?? null,
      locationLabel: payloadForNotes.locationLabel,
      departureLocationLabel: payloadForNotes.departureLocationLabel ?? null,
      arrivalLocationLabel: payloadForNotes.arrivalLocationLabel ?? null,
      routeStyle: payloadForNotes.routeStyle ?? null,
    });
    updates.derived_geometry_kind = geometry.kind;
    updates.derived_geometry_geojson = geometry.geojson;
    updates.geometry_confidence = geometry.confidence;
    updates.geometry_source = geometry.geometrySource;
  }

  return updates;
}

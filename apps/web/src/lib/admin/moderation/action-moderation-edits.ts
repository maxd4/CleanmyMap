import { z } from "zod";
import {
  CIGARETTE_BUTTS_PROVENANCES,
} from "@/lib/waste/cigarette-butts";
import { parseDrawingFromNotes } from "@/lib/actions/geometry/drawing";
import {
  buildPersistedGeometry,
  GEOMETRY_CONFIDENCE,
  toGeoJsonString,
} from "@/lib/actions/geometry/derived-geometry";
import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import { buildPersistedNotes } from "@/lib/actions/store-notes";
import type { ActionDrawing, CreateActionPayload } from "@/lib/actions/types";
import type { getSupabaseServerClient } from "@/lib/supabase/server";
import { runSingleActionQuery } from "@/lib/actions/query";
import { resolveTrustedActionDepartmentForPersistence } from "@/lib/geo/action-department-resolver";
import { resolveModeratedCigaretteButtsMeasurements } from "./action-moderation-measurements";
import {
  ACTION_WASTE_MASS_RESOLUTION_KG,
  isAlignedToWasteMassResolution,
} from "@/lib/waste/measurement";
import { MAX_CIGARETTE_BUTTS_COUNT } from "@/lib/waste/cigarette-butts";
import {
  commonActionCigaretteButtSchemaFields,
  manualDrawingSchema,
} from "@/lib/validation/action";

const adminWasteBreakdownSchema = z.object({
  recyclablesKg: z.number().min(0).max(100000).nullable().optional().refine(
    (value) => value === null || value === undefined || isAlignedToWasteMassResolution(value, ACTION_WASTE_MASS_RESOLUTION_KG),
    "La masse doit respecter une résolution de 0,1 kg.",
  ),
  glassKg: z.number().min(0).max(100000).nullable().optional().refine(
    (value) => value === null || value === undefined || isAlignedToWasteMassResolution(value, ACTION_WASTE_MASS_RESOLUTION_KG),
    "La masse doit respecter une résolution de 0,1 kg.",
  ),
  householdWasteKg: z.number().min(0).max(100000).nullable().optional().refine(
    (value) => value === null || value === undefined || isAlignedToWasteMassResolution(value, ACTION_WASTE_MASS_RESOLUTION_KG),
    "La masse doit respecter une résolution de 0,1 kg.",
  ),
  otherWasteKg: z.number().min(0).max(100000).nullable().optional().refine(
    (value) => value === null || value === undefined || isAlignedToWasteMassResolution(value, ACTION_WASTE_MASS_RESOLUTION_KG),
    "La masse doit respecter une résolution de 0,1 kg.",
  ),
  unusualObjects: z.string().trim().max(2000).nullable().optional(),
  specialHandlingWaste: z.string().trim().max(2000).nullable().optional(),
});

export const actionEditsSchema = z
  .object({
    actorName: z.string().trim().max(120).nullable().optional(),
    associationName: z.string().trim().max(120).nullable().optional(),
    actionDate: z.string().date().optional(),
    locationLabel: z.string().trim().min(2).max(200).optional(),
    departmentCode: z.string().trim().max(20).nullable().optional(),
    departmentName: z.string().trim().max(120).nullable().optional(),
    departureLocationLabel: z.string().trim().max(200).nullable().optional(),
    arrivalLocationLabel: z.string().trim().max(200).nullable().optional(),
    routeStyle: z.enum(["direct", "souple"]).nullable().optional(),
    routeAdjustmentMessage: z.string().trim().max(500).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    wasteKg: z.number().min(0).max(100000).nullable().optional().refine(
      (value) => value === null || value === undefined || isAlignedToWasteMassResolution(value, ACTION_WASTE_MASS_RESOLUTION_KG),
      "La masse doit respecter une résolution de 0,1 kg.",
    ),
    cigaretteButtsMeasurements: z
      .object({
        cigaretteButtsCount: z.number().int().min(0).max(MAX_CIGARETTE_BUTTS_COUNT).nullable(),
        cigaretteButtsMassKg: z.number().min(0).max(100_000).nullable(),
        cigaretteButtsVolumeLiters: z.number().min(0).max(100_000).nullable(),
        cigaretteButtsCondition: z.enum(["propre", "humide", "mouille"]).nullable(),
        cigaretteButtsCountProvenance: z.enum(CIGARETTE_BUTTS_PROVENANCES),
        cigaretteButtsMassProvenance: z.enum(CIGARETTE_BUTTS_PROVENANCES),
        cigaretteButtsVolumeProvenance: z.enum(CIGARETTE_BUTTS_PROVENANCES),
        cigaretteButtsConversionFormulaVersion: z.string().max(120).nullable(),
      })
      .nullable()
      .optional(),
    ...commonActionCigaretteButtSchemaFields,
    volunteersCount: z.number().int().min(1).max(500).optional(),
    durationMinutes: z.number().int().min(0).max(24 * 60).optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
    placeType: z.string().trim().max(80).nullable().optional(),
    submissionMode: z.enum(["quick", "complete"]).nullable().optional(),
    wasteBreakdown: adminWasteBreakdownSchema.nullable().optional(),
    wasteMeasurementMethod: z
      .enum(["balance_suspendue", "balance_au_sol", "estimation_visuelle", "autre", "inconnue"])
      .nullable()
      .optional(),
    manualDrawing: manualDrawingSchema.nullable().optional(),
  })
  .optional();

export const cleanPlaceEditsSchema = z
  .object({
    label: z.string().trim().min(2).max(200).optional(),
    spotType: z.enum(["spot", "clean_place"]).optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .optional();

export type AdminCleanPlaceEdits = z.infer<typeof cleanPlaceEditsSchema>;

type ExistingActionRow = {
  action_date: string;
  location_label: string;
  department_code?: string | null;
  department_name?: string | null;
  latitude: number | null;
  longitude: number | null;
  derived_geometry_kind?: "point" | "polyline" | "polygon" | "multiline" | null;
  derived_geometry_geojson?: string | null;
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

function preserveNullableTextEdit(
  next: string | null | undefined,
  current: string | null,
): string | null {
  return next === undefined ? current : next;
}

function preserveOptionalEdit<T>(next: T | undefined, current: T): T {
  return next === undefined ? current : next;
}

async function loadExistingAction(
  supabase: SupabaseServerClient,
  id: string,
): Promise<ExistingActionRow> {
  let row: ExistingActionRow | null;
  try {
    row = await runSingleActionQuery<ExistingActionRow>(supabase, (query) =>
      query
        .select(
          "action_date, location_label, department_code, department_name, latitude, longitude, derived_geometry_kind, derived_geometry_geojson, waste_kg, cigarette_butts, volunteers_count, duration_minutes, actor_name, notes",
        )
        .eq("id", id)
        .maybeSingle(),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (!message.includes("does not exist") || !message.includes("department_")) {
      throw error;
    }
    row = await runSingleActionQuery<ExistingActionRow>(supabase, (query) =>
      query
        .select(
          "action_date, location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count, duration_minutes, actor_name, notes",
        )
        .eq("id", id)
        .maybeSingle(),
    );
  }

  if (!row) {
    throw new Error("Action not found");
  }
  return row;
}

async function resolveDepartmentForModeration(params: {
  existing: ExistingActionRow;
  payload: CreateActionPayload;
  edits: NonNullable<z.infer<typeof actionEditsSchema>>;
  manualDrawing: ActionDrawing | null;
}) {
  const { existing, payload, edits, manualDrawing } = params;
  const spatiallyChanged =
    edits.manualDrawing !== undefined ||
    (edits.latitude !== undefined && edits.latitude !== existing.latitude) ||
    (edits.longitude !== undefined && edits.longitude !== existing.longitude);
  return resolveTrustedActionDepartmentForPersistence({
    latitude: payload.latitude,
    longitude: payload.longitude,
    geometry:
      edits.manualDrawing !== undefined
        ? {
            kind: manualDrawing?.kind ?? "point",
            coordinates: manualDrawing?.coordinates ?? [],
          }
        : {
            kind: existing.derived_geometry_kind,
            geojson: existing.derived_geometry_geojson,
          },
    departmentCode: payload.departmentCode,
    departmentName: payload.departmentName,
    existingDepartmentCode: existing.department_code,
    existingDepartmentName: existing.department_name,
    spatiallyChanged,
  });
}


function buildAdminActionPayload(params: {
  existing: ExistingActionRow;
  edits: NonNullable<z.infer<typeof actionEditsSchema>>;
  parsedMetadata: ReturnType<typeof extractActionMetadataFromNotes>;
  manualDrawing: ActionDrawing | null;
  hasCigaretteButtsMeasurementEdit: boolean;
  cigaretteButtsMeasurements: ReturnType<
    typeof resolveModeratedCigaretteButtsMeasurements
  >["measurements"];
}): CreateActionPayload {
  const {
    existing,
    edits,
    parsedMetadata,
    manualDrawing,
    hasCigaretteButtsMeasurementEdit,
    cigaretteButtsMeasurements,
  } = params;

  return {
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
    departmentCode: preserveNullableTextEdit(
      edits.departmentCode,
      existing.department_code ?? null,
    ),
    departmentName: preserveNullableTextEdit(
      edits.departmentName,
      existing.department_name ?? null,
    ),
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
    wasteKg:
      edits.wasteKg !== undefined
        ? edits.wasteKg
        : existing.waste_kg === null
          ? null
          : Number(existing.waste_kg),
    cigaretteButts:
      edits.cigaretteButts !== undefined
        ? edits.cigaretteButts
        : existing.cigarette_butts === null
          ? null
          : Number(existing.cigarette_butts),
    cigaretteButtsKg: hasCigaretteButtsMeasurementEdit
      ? cigaretteButtsMeasurements?.cigaretteButtsMassKg
      : preserveOptionalEdit(edits.cigaretteButtsKg, parsedMetadata.cigaretteButtsKg),
    cigaretteButtsMeasurements,
    cigaretteButtsMassKg: cigaretteButtsMeasurements?.cigaretteButtsMassKg,
    cigaretteButtsVolumeLiters:
      cigaretteButtsMeasurements?.cigaretteButtsVolumeLiters,
    cigaretteButtsCondition: cigaretteButtsMeasurements?.cigaretteButtsCondition,
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
    wasteMeasurementMethod: preserveOptionalEdit(
      edits.wasteMeasurementMethod,
      parsedMetadata.wasteMeasurementMethod ?? undefined,
    ),
    wasteBreakdown:
      edits.wasteBreakdown !== undefined
        ? edits.wasteBreakdown ?? undefined
        : parsedMetadata.wasteBreakdown ?? undefined,
    manualDrawing: manualDrawing ?? undefined,
    photos: parsedMetadata.photos as CreateActionPayload["photos"] | undefined,
    visionEstimate: parsedMetadata.visionEstimate ?? undefined,
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
  const {
    hasMeasurementEdit: hasCigaretteButtsMeasurementEdit,
    measurements: cigaretteButtsMeasurements,
  } = resolveModeratedCigaretteButtsMeasurements({
    edits,
    parsedMetadata,
    existingCigaretteButts: existing.cigarette_butts,
  });

  const payloadForNotes = buildAdminActionPayload({
    existing,
    edits,
    parsedMetadata,
    manualDrawing,
    hasCigaretteButtsMeasurementEdit,
    cigaretteButtsMeasurements,
  });

  const department = await resolveDepartmentForModeration({
    existing,
    payload: payloadForNotes,
    edits,
    manualDrawing,
  });

  const updates: Record<string, unknown> = {
    status,
    actor_name:
      edits.actorName !== undefined
        ? nullableText(edits.actorName)
        : nullableText(existing.actor_name),
    action_date: payloadForNotes.actionDate,
    location_label: payloadForNotes.locationLabel,
    department_code: department.departmentCode,
    department_name: department.departmentName,
    latitude: edits.latitude !== undefined ? edits.latitude : existing.latitude,
    longitude: edits.longitude !== undefined ? edits.longitude : existing.longitude,
    waste_kg: payloadForNotes.wasteKg,
    cigarette_butts: payloadForNotes.cigaretteButts,
    volunteers_count: payloadForNotes.volunteersCount,
    duration_minutes: payloadForNotes.durationMinutes,
    notes: buildPersistedNotes(payloadForNotes, {
      resolvedCigaretteButtsMeasurements: hasCigaretteButtsMeasurementEdit
        ? cigaretteButtsMeasurements ?? null
        : undefined,
    }),
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
    updates["derived_geometry_kind"] = geometry.kind;
    updates["derived_geometry_geojson"] = geometry.geojson;
    updates["geometry_confidence"] = geometry.confidence;
    updates["geometry_source"] = geometry.geometrySource;
  }

  return updates;
}

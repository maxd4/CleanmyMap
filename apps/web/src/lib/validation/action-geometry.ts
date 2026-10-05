import { z } from "zod";
import { resolveActionRouteTopology } from "@/lib/actions/route-topology";
import { inferGpxTopology, MAX_GPX_POINTS } from "@/lib/actions/geometry/gpx";
import { polylineDistanceKm } from "@/lib/geo/geodesic-distance";
import {
  isRoutePlannerProofShape,
  type RoutePlannerProof,
} from "@/lib/route/route-planner-proof-contract";

export const actionInputGeometrySourceSchema = z.enum([
  "manual",
  "gpx_import",
  "reference",
  "routed",
  "estimated_route",
  "estimated_area",
  "fallback_point",
]);

export const locationCoordinatesSchema = z
  .object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
  })
  .strict();

function validateMinimumGeometryPoints(
  value: { kind: "polyline" | "polygon"; coordinates: unknown[] },
  ctx: z.RefinementCtx,
) {
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
}

export const gpxImportMetadataSchema = z
  .object({
    source: z.literal("gpx_import"),
    observedDistanceKm: z.number().finite().min(0).max(1000),
    pointCount: z.number().int().min(2).max(MAX_GPX_POINTS),
    inferredTopology: z.enum(["loop", "point_to_point"]),
    fileName: z
      .string()
      .max(120)
      .refine(
        (value) => !/[\u0000-\u001f\u007f]/.test(value),
        "Nom de fichier GPX invalide.",
      )
      .optional(),
  })
  .strict();

const coordinateSchema = z.tuple([
  z.number().finite().min(-90).max(90),
  z.number().finite().min(-180).max(180),
]);

export const manualDrawingSchema = z
  .object({
    kind: z.enum(["polyline", "polygon"]),
    coordinates: z.array(coordinateSchema).max(400),
  })
  .superRefine(validateMinimumGeometryPoints);

export const contractGeometrySchema = z
  .object({
    kind: z.enum(["polyline", "polygon"]),
    coordinates: z.array(coordinateSchema).max(400),
    geometrySource: actionInputGeometrySourceSchema.nullable().optional(),
  })
  .superRefine(validateMinimumGeometryPoints);

export const routePlannerProofSchema = z
  .custom<RoutePlannerProof>(
    isRoutePlannerProofShape,
    "Preuve du snapshot planner invalide.",
  )
  .nullable()
  .optional();

export const commonActionRouteSchemaFields = {
  departureLocationLabel: z.string().min(2).max(200).optional(),
  arrivalLocationLabel: z.string().min(2).max(200).optional(),
  routeTopology: z.enum(["loop", "point_to_point"]).optional(),
  routeStyle: z.enum(["direct", "souple"]).optional(),
  routeAdjustmentMessage: z.string().max(500).optional(),
};

export function addRouteTopologyIssue(
  value: {
    routeTopology?: "loop" | "point_to_point";
    arrivalLocationLabel?: string | null;
    recordType?: "action" | "clean_place" | "spot" | "other" | null;
  },
  ctx: z.RefinementCtx,
  path: (string | number)[] = ["arrivalLocationLabel"],
) {
  const topology = resolveActionRouteTopology({
    topology: value.routeTopology,
    arrivalLocationLabel: value.arrivalLocationLabel,
    recordType: value.recordType,
  });
  if (topology === "point_to_point" && !value.arrivalLocationLabel?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: "Une arrivée est obligatoire pour un parcours départ → arrivée.",
    });
  }
}

type GpxImportValidationContext = {
  drawing: { kind: "polyline" | "polygon"; coordinates: [number, number][] };
  metadata: {
    source: "gpx_import";
    observedDistanceKm: number;
    pointCount: number;
    inferredTopology: "loop" | "point_to_point";
  };
};

type GpxImportValidationInput = {
  geometrySource?: string | null;
  manualDrawing?: { kind: "polyline" | "polygon"; coordinates: [number, number][] };
  preparationData?: {
    routeTopology?: "loop" | "point_to_point";
    gpxImport?: {
      source: "gpx_import";
      observedDistanceKm: number;
      pointCount: number;
      inferredTopology: "loop" | "point_to_point";
    };
  } | null;
  routeTopology?: "loop" | "point_to_point";
  arrivalLocationLabel?: string | null;
  recordType?: "action" | "clean_place" | "spot" | "other" | null;
};

function resolveGpxImportValidationContext(
  value: GpxImportValidationInput,
  ctx: z.RefinementCtx,
): GpxImportValidationContext | null {
  const metadata = value.preparationData?.gpxImport;
  if (value.geometrySource !== "gpx_import" && !metadata) return null;

  const drawing = value.manualDrawing;
  if (value.geometrySource !== "gpx_import") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["geometrySource"],
      message: "Un tracé GPX doit conserver la provenance gpx_import.",
    });
    return null;
  }
  if (!drawing || drawing.kind !== "polyline") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["manualDrawing"],
      message: "Un tracé GPX valide est obligatoire lorsque la provenance est gpx_import.",
    });
    return null;
  }
  if (!metadata) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["preparationData", "gpxImport"],
      message: "Les métadonnées du tracé GPX sont obligatoires.",
    });
    return null;
  }

  return { drawing, metadata };
}

function addGpxTopologyIssue(
  value: {
    routeTopology?: "loop" | "point_to_point";
    arrivalLocationLabel?: string | null;
    recordType?: "action" | "clean_place" | "spot" | "other" | null;
  },
  context: GpxImportValidationContext,
  ctx: z.RefinementCtx,
) {
  const topology = resolveActionRouteTopology({
    topology: value.routeTopology,
    arrivalLocationLabel: value.arrivalLocationLabel,
    recordType: value.recordType,
  });
  const inferredTopology = inferGpxTopology(context.drawing.coordinates);
  if (topology === inferredTopology && context.metadata.inferredTopology === inferredTopology) return;

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ["routeTopology"],
    message:
      inferredTopology === "loop"
        ? "Ce GPX est fermé : sélectionnez la topologie Boucle ou choisissez un autre fichier."
        : "Ce GPX est ouvert : sélectionnez la topologie Départ → arrivée ou choisissez un autre fichier.",
  });
}

function addGpxDistanceIssue(
  context: GpxImportValidationContext,
  ctx: z.RefinementCtx,
) {
  const observedDistanceKm = polylineDistanceKm(context.drawing.coordinates);
  const distanceMatches = Math.abs(context.metadata.observedDistanceKm - observedDistanceKm) <= 0.01;
  const pointCountMatches = context.metadata.pointCount === context.drawing.coordinates.length;
  if (distanceMatches && pointCountMatches) return;

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ["preparationData", "gpxImport"],
    message: "La distance ou le nombre de points du GPX ne correspond pas au tracé fourni.",
  });
}

export function addGpxImportIssue(
  value: GpxImportValidationInput,
  ctx: z.RefinementCtx,
) {
  const context = resolveGpxImportValidationContext(value, ctx);
  if (!context) return;

  addGpxTopologyIssue({
    routeTopology: value.routeTopology ?? value.preparationData?.routeTopology,
    arrivalLocationLabel: value.arrivalLocationLabel,
    recordType: value.recordType,
  }, context, ctx);
  addGpxDistanceIssue(context, ctx);
}

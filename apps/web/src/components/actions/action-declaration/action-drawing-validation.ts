import type { ActionDrawing } from "@/lib/actions/types";
import {
  isRenderableDrawing,
  normalizeDrawingCoordinates,
} from "@/lib/actions/geometry/geometry-core";

type ActionDrawingValidationTone =
  | "neutral"
  | "success"
  | "warning"
  | "error";

export type ActionDrawingValidationSummary = {
  normalized: ActionDrawing | null;
  rawPointCount: number;
  pointCount: number;
  hasDuplicates: boolean;
  isValid: boolean;
  tone: ActionDrawingValidationTone;
  message: string;
};

export function summarizeActionDrawingValidation(
  drawing: ActionDrawing | null | undefined,
): ActionDrawingValidationSummary {
  if (!drawing) {
    return {
      normalized: null,
      rawPointCount: 0,
      pointCount: 0,
      hasDuplicates: false,
      isValid: false,
      tone: "neutral",
      message: "Aucun tracé.",
    };
  }

  const rawPointCount = drawing.coordinates.length;
  const coordinates = normalizeDrawingCoordinates(drawing);
  const pointCount = coordinates.length;
  const hasDuplicates = pointCount < rawPointCount;
  const minPoints = drawing.kind === "polygon" ? 3 : 2;
  const normalized =
    isRenderableDrawing({ kind: drawing.kind, coordinates }) && pointCount >= minPoints
      ? { kind: drawing.kind, coordinates }
      : null;

  if (!drawing.coordinates.length) {
    return {
      normalized: null,
      rawPointCount,
      pointCount,
      hasDuplicates,
      isValid: false,
      tone: "error",
      message:
        drawing.kind === "polygon"
          ? "Polygone incomplet."
          : "Tracé incomplet.",
    };
  }

  if (pointCount === 0) {
    return {
      normalized: null,
      rawPointCount,
      pointCount,
      hasDuplicates,
      isValid: false,
      tone: "error",
      message: "Aucune coordonnée exploitable.",
    };
  }

  if (pointCount < minPoints) {
    return {
      normalized: null,
      rawPointCount,
      pointCount,
      hasDuplicates,
      isValid: false,
      tone: "warning",
      message:
        drawing.kind === "polygon"
          ? "3 points minimum pour un polygone."
          : "2 points minimum pour un tracé.",
    };
  }

  return {
    normalized,
    rawPointCount,
    pointCount,
    hasDuplicates,
    isValid: Boolean(normalized),
    tone: hasDuplicates ? "warning" : "success",
    message: hasDuplicates
      ? "Doublons retirés, tracé validé."
      : drawing.kind === "polygon"
        ? "Polygone validé."
        : "Tracé validé.",
  };
}

import type { ActionDrawing, ActionGeometrySource } from "@/lib/actions/types";

export type ActionDrawingUndoOperation = "removed" | "modified" | "replaced";

export type ActionDrawingSnapshot = {
  drawing: ActionDrawing;
  source: ActionGeometrySource;
};

export type ActionDrawingUndoState = {
  previous: ActionDrawingSnapshot;
  current: ActionDrawingSnapshot | null;
  operation: ActionDrawingUndoOperation;
};

export function createActionDrawingSnapshot(
  drawing: ActionDrawing | null,
  source: ActionGeometrySource | null | undefined,
): ActionDrawingSnapshot | null {
  if (!drawing) return null;
  return { drawing, source: source ?? "manual" };
}

export function createActionDrawingUndoState(
  previous: ActionDrawingSnapshot | null,
  current: ActionDrawingSnapshot | null,
  operation: ActionDrawingUndoOperation,
): ActionDrawingUndoState | null {
  return previous ? { previous, current, operation } : null;
}

export function areActionDrawingSnapshotsEqual(
  left: ActionDrawingSnapshot | null,
  right: ActionDrawingSnapshot | null,
): boolean {
  if (!left || !right) return left === right;
  if (left.source !== right.source || left.drawing.kind !== right.drawing.kind) return false;
  if (left.drawing.coordinates.length !== right.drawing.coordinates.length) return false;
  return left.drawing.coordinates.every(
    ([leftLatitude, leftLongitude], index) => {
      const [rightLatitude, rightLongitude] = right.drawing.coordinates[index] ?? [];
      return leftLatitude === rightLatitude && leftLongitude === rightLongitude;
    },
  );
}

export function canRestoreActionDrawingUndo(
  state: ActionDrawingUndoState,
  current: ActionDrawingSnapshot | null,
): boolean {
  return areActionDrawingSnapshotsEqual(state.current, current);
}

export function getActionDrawingUndoCopy(operation: ActionDrawingUndoOperation): {
  title: string;
  message: string;
} {
  const subject = operation === "removed"
    ? "retiré"
    : operation === "modified"
      ? "modifié"
      : "remplacé";
  return {
    title: `Tracé ${subject}`,
    message: `Le tracé a été ${subject} localement au formulaire. Restaurer ici ne revient pas sur une mutation serveur déjà envoyée.`,
  };
}

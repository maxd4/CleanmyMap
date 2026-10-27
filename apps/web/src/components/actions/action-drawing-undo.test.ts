import { describe, expect, it } from "vitest";
import {
  areActionDrawingSnapshotsEqual,
  canRestoreActionDrawingUndo,
  createActionDrawingSnapshot,
  createActionDrawingUndoState,
  getActionDrawingUndoCopy,
} from "./action-drawing-undo";

const previous = createActionDrawingSnapshot(
  {
    kind: "polygon",
    coordinates: [[48.85, 2.35], [48.851, 2.351], [48.852, 2.35], [48.85, 2.35]],
  },
  "gpx_import",
)!;

describe("action drawing undo contract", () => {
  it("keeps the complete geometry and its provenance in the transient snapshot", () => {
    const state = createActionDrawingUndoState(previous, null, "removed");

    expect(state?.previous).toEqual(previous);
    expect(state?.previous.drawing.coordinates).toHaveLength(4);
    expect(state?.previous.source).toBe("gpx_import");
    expect(canRestoreActionDrawingUndo(state!, null)).toBe(true);
  });

  it("accepts only the exact post-operation state", () => {
    const state = createActionDrawingUndoState(previous, null, "removed")!;
    const changed = createActionDrawingSnapshot(
      { kind: "polygon", coordinates: [[48.85, 2.35], [48.851, 2.351], [48.852, 2.351], [48.85, 2.35]] },
      "gpx_import",
    );

    expect(canRestoreActionDrawingUndo(state, changed)).toBe(false);
    expect(areActionDrawingSnapshotsEqual(previous, changed)).toBe(false);
  });

  it.each([
    ["removed", "Tracé retiré"],
    ["modified", "Tracé modifié"],
    ["replaced", "Tracé remplacé"],
  ] as const)("describes the %s operation accurately", (operation, title) => {
    expect(getActionDrawingUndoCopy(operation).title).toBe(title);
    expect(getActionDrawingUndoCopy(operation).message).toContain("localement");
    expect(getActionDrawingUndoCopy(operation).message).toContain("mutation serveur déjà envoyée");
  });

  it("defaults an unqualified manual drawing to the canonical manual provenance", () => {
    expect(createActionDrawingSnapshot({ kind: "polyline", coordinates: [[48.85, 2.35], [48.851, 2.351]] }, null)?.source).toBe("manual");
  });
});

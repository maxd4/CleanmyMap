/** @vitest-environment jsdom */

import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionDrawing, ActionGeometrySource } from "@/lib/actions/types";
import type { ActionLocationViewModel } from "./action-location.model";
import { ActionLocationMapPanel } from "./action-location-geometry-sections";

vi.mock("next/dynamic", () => ({
  default: () => function MockActionDrawingMap() {
    return <div data-testid="mock-action-drawing-map" />;
  },
}));

vi.mock("@/components/ui/use-in-view-once", () => ({
  useInViewOnce: () => ({ ref: { current: null }, isInView: true }),
}));

const initialDrawing: ActionDrawing = {
  kind: "polygon",
  coordinates: [[48.85, 2.35], [48.851, 2.351], [48.852, 2.35], [48.85, 2.35]],
};

function makeViewModel(drawing: ActionDrawing | null, source: ActionGeometrySource | null): ActionLocationViewModel {
  const summary = {
    normalized: drawing,
    pointCount: drawing?.coordinates.length ?? 0,
    tone: "success" as const,
  } as ActionLocationViewModel["activeSummary"];
  return {
    activeGeometry: drawing && source ? { drawing, source, operationalRoute: null } : null,
    displayedDrawing: drawing,
    previewSummary: summary,
    activeSummary: summary,
    isManual: source === "manual",
    isGpx: source === "gpx_import",
    isTracking: source === "gps_tracking",
    hasDrawing: Boolean(drawing),
    statusTone: drawing ? "success" : "neutral",
  };
}

describe("ActionLocationMapPanel reversible external clearing", () => {
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.append(host);
  });

  afterEach(() => {
    if (root) act(() => root?.unmount());
    host?.remove();
    root = null;
    host = null;
  });

  it("routes external Effacer through the same Annuler flow and restores exact provenance", () => {
    const restored: Array<{ drawing: ActionDrawing | null; source?: ActionGeometrySource | null }> = [];
    function Harness() {
      const [drawing, setDrawing] = React.useState<ActionDrawing | null>(initialDrawing);
      const [source, setSource] = React.useState<ActionGeometrySource | null>("manual");
      return (
        <ActionLocationMapPanel
          form={{ recordType: "action" } as never}
          setManualDrawing={(next, nextSource) => {
            restored.push({ drawing: next, source: nextSource });
            setDrawing(next);
            setSource(nextSource ?? null);
          }}
          onResetManualDrawing={() => {
            setDrawing(null);
            setSource(null);
          }}
          gpxImport={null}
          viewModel={makeViewModel(drawing, source)}
        />
      );
    }

    act(() => {
      root = createRoot(host!);
      root.render(<Harness />);
    });

    const clear = host?.querySelector<HTMLButtonElement>('[aria-label="Effacer le repère manuel"]');
    expect(clear).not.toBeNull();
    act(() => clear?.click());
    expect(host?.textContent).toContain("Tracé retiré");
    const undoButton = [...(host?.querySelectorAll("button") ?? [])].find((button) => button.textContent === "Annuler");
    expect(undoButton).not.toBeNull();

    act(() => undoButton?.click());
    expect(restored).toEqual([{ drawing: initialDrawing, source: "manual" }]);
    expect(host?.textContent).toContain("Repère manuel");
    expect(host?.textContent).not.toContain("Tracé retiré");
  });

  it("does not restore after an external replacement and leaves the workflow owner untouched", () => {
    const replacement: ActionDrawing = { kind: "polyline", coordinates: [[48.9, 2.4], [48.901, 2.401]] };
    let setDrawingFromHarness: ((drawing: ActionDrawing | null, source: ActionGeometrySource | null) => void) | null = null;
    function Harness() {
      const [drawing, setDrawing] = React.useState<ActionDrawing | null>(initialDrawing);
      const [source, setSource] = React.useState<ActionGeometrySource | null>("manual");
      setDrawingFromHarness = (next, nextSource) => { setDrawing(next); setSource(nextSource); };
      return <ActionLocationMapPanel form={{ recordType: "action" } as never} setManualDrawing={vi.fn()} onResetManualDrawing={() => { setDrawing(null); setSource(null); }} gpxImport={null} viewModel={makeViewModel(drawing, source)} />;
    }

    act(() => {
      root = createRoot(host!);
      root.render(<Harness />);
    });
    act(() => host?.querySelector<HTMLButtonElement>('[aria-label="Effacer le repère manuel"]')?.click());
    expect(host?.textContent).toContain("Annuler");

    act(() => setDrawingFromHarness?.(replacement, "gpx_import"));
    expect(host?.textContent).not.toContain("Annuler");
    expect(host?.textContent).toContain("Tracé GPX importé");
  });
});

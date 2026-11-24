// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SpogomiRouteProjection } from "@/lib/spogomi/route-types";

const mocks = vi.hoisted(() => ({
  uploadActionRouteReference: vi.fn(),
  lastMapValue: null as { kind: string; coordinates: Array<[number, number]> } | null,
  triggerMapChange: null as ((next: { kind: "polyline"; coordinates: Array<[number, number]> }) => void) | null,
}));

vi.mock("next/dynamic", () => ({
  default: () => function DynamicDrawingMap({
    value,
    onChange,
  }: {
    value: { kind: string; coordinates: Array<[number, number]> } | null;
    onChange: (next: { kind: "polyline"; coordinates: Array<[number, number]> }) => void;
  }) {
    mocks.lastMapValue = value;
    mocks.triggerMapChange = onChange;
    return (
      <div>
        <span data-testid="map-coords">{value ? JSON.stringify(value.coordinates) : "none"}</span>
        <button
          type="button"
          data-testid="edit-map"
          onClick={() => onChange({ kind: "polyline", coordinates: [[48.81, 2.31], [48.82, 2.32]] })}
        >
          Modifier dessin
        </button>
      </div>
    );
  },
}));

vi.mock("@/lib/actions/action-media/action-route-reference-client", () => ({
  uploadActionRouteReference: mocks.uploadActionRouteReference,
}));

import { SpogomiRouteEditor } from "./spogomi-route-editor";

(globalThis as unknown as Record<string, boolean>).IS_REACT_ACT_ENVIRONMENT = true;

function makeRoute(overrides: Partial<SpogomiRouteProjection> = {}): SpogomiRouteProjection {
  return {
    id: "route-1",
    event_id: "event-1",
    action_id: "action-1",
    division_id: null,
    route_version: 1,
    source: "manual_reference",
    file_name: "Parcours",
    point_count: 2,
    reference_distance_km: 1.2,
    inferred_topology: "point_to_point",
    geometry_geojson: { type: "LineString", coordinates: [[2.35, 48.85], [2.36, 48.86]] },
    last_change_reason: null,
    reference_media_id: null,
    updated_at: "2026-11-10T08:00:00Z",
    created_at: "2026-11-10T08:00:00Z",
    ...overrides,
  };
}

describe("SpogomiRouteEditor", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.lastMapValue = null;
    mocks.triggerMapChange = null;
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it("uploads private reference images via uploadActionRouteReference during pre_action", async () => {
    mocks.uploadActionRouteReference.mockResolvedValue({ id: "media-ref-1", signedUrl: "https://example.test/signed" });
    const action = vi.fn().mockResolvedValue({});
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(
        <SpogomiRouteEditor
          eventId="event-1"
          actionId="action-1"
          activeDivisionId={null}
          divisionLabel="Partagé"
          eventState="draft"
          expectedRevision={3}
          route={makeRoute()}
          busy={false}
          action={action}
        />,
      );
    });

    const imageInput = container.querySelector<HTMLInputElement>('input[accept="image/jpeg,image/png,image/webp"]')!;
    const file = new File(["img"], "ref.png", { type: "image/png" });
    Object.defineProperty(imageInput, "files", { value: [file], configurable: true });
    await act(async () => {
      imageInput.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mocks.uploadActionRouteReference).toHaveBeenCalledWith("action-1", file);
    expect(action).toHaveBeenCalledWith(
      "/api/spogomi/events/event-1/routes/reference-media",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          divisionId: null,
          expectedRevision: 3,
          mediaId: "media-ref-1",
          correctionReason: null,
        }),
      }),
      null,
    );
  });

  it("reconciles server updates v1 -> v2 when clean, preserves local edits when dirty, and blocks stale save until server version is loaded", async () => {
    const action = vi.fn().mockResolvedValue({});
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    const v1 = makeRoute({ route_version: 1, geometry_geojson: { type: "LineString", coordinates: [[2.35, 48.85], [2.36, 48.86]] } });
    const v2 = makeRoute({ route_version: 2, geometry_geojson: { type: "LineString", coordinates: [[2.40, 48.90], [2.41, 48.91]] } });

    const renderWith = (route: SpogomiRouteProjection | null, expectedRevision: number, activeDivisionId: string | null = null) =>
      root!.render(
        <SpogomiRouteEditor
          eventId="event-1"
          actionId="action-1"
          activeDivisionId={activeDivisionId}
          divisionLabel={activeDivisionId ? "World Cup" : "Partagé"}
          eventState="draft"
          expectedRevision={expectedRevision}
          route={route}
          busy={false}
          action={action}
        />,
      );

    await act(async () => { renderWith(v1, 3); });
    expect(container.querySelector('[data-testid="map-coords"]')?.textContent).toBe("[[48.85,2.35],[48.86,2.36]]");

    // Server refresh v1 -> v2 while editor is clean: updates drawing without unmount
    await act(async () => { renderWith(v2, 4); });
    expect(container.querySelector('[data-testid="map-coords"]')?.textContent).toBe("[[48.9,2.4],[48.91,2.41]]");

    // User modifies drawing locally
    await act(async () => {
      container!.querySelector<HTMLButtonElement>('[data-testid="edit-map"]')!.click();
    });
    expect(container.querySelector('[data-testid="map-coords"]')?.textContent).toBe("[[48.81,2.31],[48.82,2.32]]");

    // Server updates to v3 while user has unsaved local edits
    const v3 = makeRoute({ route_version: 3, geometry_geojson: { type: "LineString", coordinates: [[2.50, 48.95], [2.51, 48.96]] } });
    await act(async () => { renderWith(v3, 5); });

    // Local drawing is preserved, warning is shown, and save is blocked
    expect(container.querySelector('[data-testid="map-coords"]')?.textContent).toBe("[[48.81,2.31],[48.82,2.32]]");
    expect(container.textContent).toContain("Une nouvelle version serveur du parcours est disponible");
    const saveButton = Array.from(container.querySelectorAll("button")).find((btn) => btn.textContent?.includes("Enregistrer le parcours"))!;
    expect(saveButton.disabled).toBe(true);
    expect(action).not.toHaveBeenCalled();

    // User explicitly loads server version
    const loadServerButton = Array.from(container.querySelectorAll("button")).find((btn) => btn.textContent?.includes("Charger la version serveur"))!;
    await act(async () => { loadServerButton.click(); });
    expect(container.querySelector('[data-testid="map-coords"]')?.textContent).toBe("[[48.95,2.5],[48.96,2.51]]");
    expect(saveButton.disabled).toBe(false);

    // Division switch resets drawing to the new division's route
    const wcRoute = makeRoute({ id: "route-wc", division_id: "div-wc", route_version: 1, geometry_geojson: { type: "LineString", coordinates: [[2.1, 48.1], [2.2, 48.2]] } });
    await act(async () => { renderWith(wcRoute, 5, "div-wc"); });
    expect(container.querySelector('[data-testid="map-coords"]')?.textContent).toBe("[[48.1,2.1],[48.2,2.2]]");
  });
});

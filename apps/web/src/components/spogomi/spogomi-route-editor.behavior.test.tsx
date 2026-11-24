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
    readOnly,
  }: {
    value: { kind: string; coordinates: Array<[number, number]> } | null;
    onChange: (next: { kind: "polyline"; coordinates: Array<[number, number]> }) => void;
    readOnly?: boolean;
  }) {
    mocks.lastMapValue = value;
    mocks.triggerMapChange = onChange;
    return (
      <div>
        <span data-testid="map-coords">{value ? JSON.stringify(value.coordinates) : "none"}</span>
        <span data-testid="map-readonly">{readOnly ? "readonly" : "editable"}</span>
        <button
          type="button"
          data-testid="edit-map"
          disabled={readOnly}
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

vi.mock("@/lib/actions/geometry/gpx", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/actions/geometry/gpx")>();
  return {
    ...actual,
    parseGpxFile: vi.fn(async () => ({
      drawing: { kind: "polyline", coordinates: [[48.77, 2.27], [48.78, 2.28]] },
      metadata: { fileName: "import.gpx", pointCount: 2, observedDistanceKm: 1.5, inferredTopology: "point_to_point" },
    })),
  };
});

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

  it("preserves local edits and shows explicit errors when action() returns null for saveDrawing, importGpx, or addReferenceImage", async () => {
    const action = vi.fn().mockResolvedValue(null);
    mocks.uploadActionRouteReference.mockResolvedValue({ id: "media-ref-2", signedUrl: "https://example.test/signed" });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    const v1 = makeRoute({ route_version: 1, geometry_geojson: { type: "LineString", coordinates: [[2.35, 48.85], [2.36, 48.86]] } });
    const renderWith = (route: SpogomiRouteProjection | null, expectedRevision: number) =>
      root!.render(
        <SpogomiRouteEditor
          eventId="event-1"
          actionId="action-1"
          activeDivisionId={null}
          divisionLabel="Partagé"
          eventState="in_progress"
          expectedRevision={expectedRevision}
          route={route}
          busy={false}
          action={action}
        />,
      );

    await act(async () => { renderWith(v1, 3); });
    await act(async () => { container!.querySelector<HTMLButtonElement>('[data-testid="edit-map"]')!.click(); });
    const textarea = container.querySelector("textarea")!;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
    await act(async () => {
      descriptor?.set?.call(textarea, "Motif conservé");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // 1. saveDrawing returns null -> keeps dirty drawing & reason, shows error, and subsequent refresh does not wipe drawing
    const saveButton = () => Array.from(container!.querySelectorAll("button")).find((btn) => btn.textContent?.includes("Enregistrer le parcours"))!;
    await act(async () => { saveButton().click(); await Promise.resolve(); });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Le parcours n’a pas pu être enregistré.");
    expect(container.querySelector('[data-testid="map-coords"]')?.textContent).toBe("[[48.81,2.31],[48.82,2.32]]");
    expect(container.querySelector("textarea")?.value).toBe("Motif conservé");

    // 2. importGpx returns null -> keeps local drawing & reason, shows GPX error
    const gpxInput = container.querySelector<HTMLInputElement>('input[accept=".gpx,application/gpx+xml"]')!;
    const gpxFile = new File(["<gpx />"], "route.gpx", { type: "application/gpx+xml" });
    Object.defineProperty(gpxInput, "files", { value: [gpxFile], configurable: true });
    await act(async () => {
      gpxInput.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Le GPX n’a pas pu être importé.");
    expect(container.querySelector('[data-testid="map-coords"]')?.textContent).toBe("[[48.81,2.31],[48.82,2.32]]");
    expect(container.querySelector("textarea")?.value).toBe("Motif conservé");

    // 3. addReferenceImage returns null -> clears success status, keeps reason, shows media error
    const imageInput = container.querySelector<HTMLInputElement>('input[accept="image/jpeg,image/png,image/webp"]')!;
    const imgFile = new File(["img"], "ref.png", { type: "image/png" });
    Object.defineProperty(imageInput, "files", { value: [imgFile], configurable: true });
    await act(async () => {
      imageInput.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("L’image n’a pas pu être associée.");
    expect(container.querySelector("textarea")?.value).toBe("Motif conservé");

    // 4. Remote expectedRevision changes (3 -> 4) while routeSnapshotKey stays identical -> blocks save until reconciled, then saves with rev 4
    await act(async () => { renderWith(v1, 4); });
    expect(container.querySelector('[data-testid="map-coords"]')?.textContent).toBe("[[48.81,2.31],[48.82,2.32]]");
    expect(container.textContent).toContain("Une nouvelle version serveur du parcours est disponible");
    expect(saveButton().disabled).toBe(true);

    const loadServerButton = Array.from(container.querySelectorAll("button")).find((btn) => btn.textContent?.includes("Charger la version serveur"))!;
    await act(async () => { loadServerButton.click(); });
    expect(container.querySelector('[data-testid="map-coords"]')?.textContent).toBe("[[48.85,2.35],[48.86,2.36]]");
    expect(saveButton().disabled).toBe(false);

    action.mockResolvedValueOnce({
      synchronization: {
        already_processed: false,
        eventId: "event-1",
        actionId: "action-1",
        routeId: "route-1",
        divisionId: null,
        routeVersion: 2,
        compositionRevision: 5,
        source: "manual_reference",
        fileName: "manual-route.json",
        pointCount: 2,
        referenceDistanceKm: 1.5,
        inferredTopology: "point_to_point",
      },
    });
    await act(async () => { saveButton().click(); await Promise.resolve(); });
    expect(action).toHaveBeenLastCalledWith(
      "/api/spogomi/events/event-1/routes",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          divisionId: null,
          expectedRevision: 4,
          correctionReason: "Motif conservé",
          coordinates: [[48.85, 2.35], [48.86, 2.36]],
        }),
      }),
      null,
    );
    expect(container.querySelector("textarea")?.value).toBe("");
  });

  it("locks map and reason during deferred save and synchronizes baseRevision across two consecutive saves", async () => {
    let resolveSave1!: (value: Record<string, unknown> | null) => void;
    const action = vi.fn(
      () => new Promise<Record<string, unknown> | null>((resolve) => { resolveSave1 = resolve; }),
    );
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    const routeV1 = makeRoute({ route_version: 1 });
    const renderWith = (route: SpogomiRouteProjection, expectedRevision: number) => {
      root!.render(
        <SpogomiRouteEditor
          eventId="event-1"
          actionId="action-1"
          activeDivisionId={null}
          divisionLabel="Casual"
          eventState="in_progress"
          expectedRevision={expectedRevision}
          route={route}
          busy={false}
          action={action}
        />,
      );
    };

    await act(async () => { renderWith(routeV1, 5); });
    const textarea = container.querySelector("textarea")!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
      setter.call(textarea, "Motif initial");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      container!.querySelector<HTMLButtonElement>('[data-testid="edit-map"]')!.click();
    });

    const saveBtn = Array.from(container.querySelectorAll("button")).find((btn) => btn.textContent?.includes("Enregistrer le parcours"))!;
    await act(async () => { saveBtn.click(); });

    // Map and textarea must be locked while save is in flight, and programmatic onChange ignored
    expect(container.querySelector('[data-testid="map-readonly"]')?.textContent).toBe("readonly");
    expect(textarea.disabled).toBe(true);
    await act(async () => {
      mocks.triggerMapChange?.({ kind: "polyline", coordinates: [[49.0, 2.0], [49.1, 2.1]] });
    });
    expect(container.querySelector('[data-testid="map-coords"]')?.textContent).toBe("[[48.81,2.31],[48.82,2.32]]");

    const makeSync = (
      compositionRevision: number,
      routeVersion: number,
      source: "manual_reference" | "gpx_reference" | "official_reference" = "manual_reference",
    ) => ({
      synchronization: {
        already_processed: false,
        eventId: "event-1",
        actionId: "action-1",
        routeId: "route-1",
        divisionId: null,
        routeVersion,
        compositionRevision,
        source,
        fileName: source === "gpx_reference" ? "route.gpx" : "manual-route.json",
        pointCount: 2,
        referenceDistanceKm: 1.5,
        inferredTopology: "point_to_point",
      },
    });

    // Resolve 1st save + renew props from server refresh (revision 6)
    const routeV2 = makeRoute({
      route_version: 2,
      geometry_geojson: { type: "LineString", coordinates: [[2.31, 48.81], [2.32, 48.82]] },
    });
    await act(async () => {
      resolveSave1(makeSync(6, 2));
      await Promise.resolve();
      renderWith(routeV2, 6);
    });
    expect(container.querySelector('[data-testid="map-readonly"]')?.textContent).toBe("editable");
    expect(textarea.disabled).toBe(false);

    // Second consecutive edit and save must send expectedRevision: 6
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
      setter.call(textarea, "Deuxième correction");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      mocks.triggerMapChange?.({ kind: "polyline", coordinates: [[48.91, 2.41], [48.92, 2.42]] });
    });
    action.mockResolvedValueOnce(makeSync(7, 3));
    await act(async () => {
      saveBtn.click();
      await Promise.resolve();
    });
    expect(action).toHaveBeenLastCalledWith(
      "/api/spogomi/events/event-1/routes",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          divisionId: null,
          expectedRevision: 6,
          correctionReason: "Deuxième correction",
          coordinates: [[48.91, 2.41], [48.92, 2.42]],
        }),
      }),
      null,
    );
  });

  it("reconciles RouteSynchronization when props renew before action resolves (save, GPX, image) and flags intervening remote edits", async () => {
    const makeSync = (
      compositionRevision: number,
      routeVersion: number,
      source: "manual_reference" | "gpx_reference" | "official_reference" = "manual_reference",
    ) => ({
      synchronization: {
        already_processed: false,
        eventId: "event-1",
        actionId: "action-1",
        routeId: "route-1",
        divisionId: null,
        routeVersion,
        compositionRevision,
        source,
        fileName: source === "gpx_reference" ? "route.gpx" : "manual-route.json",
        pointCount: 2,
        referenceDistanceKm: 1.5,
        inferredTopology: "point_to_point",
      },
    });

    let resolveAction!: (value: Record<string, unknown> | null) => void;
    const action = vi.fn(
      () => new Promise<Record<string, unknown> | null>((resolve) => { resolveAction = resolve; }),
    );
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    const routeV1 = makeRoute({ route_version: 1 });
    const renderWith = (route: SpogomiRouteProjection, expectedRevision: number) => {
      root!.render(
        <SpogomiRouteEditor
          eventId="event-1"
          actionId="action-1"
          activeDivisionId={null}
          divisionLabel="Casual"
          eventState="in_progress"
          expectedRevision={expectedRevision}
          route={route}
          busy={false}
          action={action}
        />,
      );
    };

    await act(async () => { renderWith(routeV1, 5); });
    const textarea = container.querySelector("textarea")!;
    const setReason = (value: string) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
      setter.call(textarea, value);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    };

    // 1. Save drawing where props renew BEFORE action resolves (like SpogomiPreparationWorkspace.action())
    await act(async () => {
      setReason("Correction 1");
      container!.querySelector<HTMLButtonElement>('[data-testid="edit-map"]')!.click();
    });
    const saveBtn = () => Array.from(container!.querySelectorAll("button")).find((btn) => btn.textContent?.includes("Enregistrer le parcours"))!;
    await act(async () => { saveBtn().click(); });

    const routeV2 = makeRoute({
      route_version: 2,
      geometry_geojson: { type: "LineString", coordinates: [[2.31, 48.81], [2.32, 48.82]] },
    });
    await act(async () => { renderWith(routeV2, 6); });
    await act(async () => {
      resolveAction(makeSync(6, 2));
      await Promise.resolve();
    });
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(textarea.value).toBe("");

    // 2. Import GPX where props renew BEFORE action resolves, then verify media upload uses rev 7
    await act(async () => { setReason("Import GPX"); });
    const gpxInput = container.querySelector<HTMLInputElement>('input[accept=".gpx,application/gpx+xml"]')!;
    const gpxFile = new File(["<gpx />"], "route.gpx", { type: "application/gpx+xml" });
    Object.defineProperty(gpxInput, "files", { value: [gpxFile], configurable: true });
    await act(async () => {
      gpxInput.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    const routeV3 = makeRoute({
      route_version: 3,
      source: "gpx_reference",
      geometry_geojson: { type: "LineString", coordinates: [[2.33, 48.83], [2.34, 48.84]] },
    });
    await act(async () => { renderWith(routeV3, 7); });
    await act(async () => {
      resolveAction(makeSync(7, 3, "gpx_reference"));
      await Promise.resolve();
    });
    expect(container.querySelector('[role="alert"]')).toBeNull();

    // 3. Reference image upload sends expectedRevision: 7 and reconciles to rev 8
    await act(async () => { setReason("Photo carte"); });
    const imageInput = container.querySelector<HTMLInputElement>('input[accept="image/jpeg,image/png,image/webp"]')!;
    const imgFile = new File(["img"], "ref.png", { type: "image/png" });
    Object.defineProperty(imageInput, "files", { value: [imgFile], configurable: true });
    await act(async () => {
      imageInput.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(action).toHaveBeenLastCalledWith(
      "/api/spogomi/events/event-1/routes/reference-media",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          divisionId: null,
          expectedRevision: 7,
          mediaId: "media-ref-2",
          correctionReason: "Photo carte",
        }),
      }),
      null,
    );
    const routeV4 = makeRoute({
      route_version: 4,
      reference_media_id: "media-1",
      geometry_geojson: { type: "LineString", coordinates: [[2.33, 48.83], [2.34, 48.84]] },
    });
    await act(async () => { renderWith(routeV4, 8); });
    await act(async () => {
      resolveAction(makeSync(8, 4, "gpx_reference"));
      await Promise.resolve();
    });
    expect(container.querySelector('[role="status"]')?.textContent).toContain("Image de référence privée enregistrée.");

    // 4. Intervening remote edit between mutation (rev 9, v5) and refresh (rev 10, v6)
    await act(async () => {
      setReason("Ma version locale");
      mocks.triggerMapChange?.({ kind: "polyline", coordinates: [[48.95, 2.45], [48.96, 2.46]] });
    });
    expect(container.querySelector('[data-testid="map-coords"]')?.textContent).toBe("[[48.95,2.45],[48.96,2.46]]");
    await act(async () => { saveBtn().click(); });
    const routeV6Remote = makeRoute({
      route_version: 6,
      geometry_geojson: { type: "LineString", coordinates: [[2.99, 48.99], [2.98, 48.98]] },
    });
    await act(async () => { renderWith(routeV6Remote, 10); });
    await act(async () => {
      resolveAction(makeSync(9, 5));
      await Promise.resolve();
    });
    expect(container.textContent).toContain("Une nouvelle version serveur du parcours est disponible");
    expect(container.textContent).toContain("Le parcours a été modifié sur le serveur pendant l’enregistrement");
    expect(container.querySelector('[data-testid="map-coords"]')?.textContent).toBe("[[48.95,2.45],[48.96,2.46]]");
    expect(saveBtn().disabled).toBe(true);
  });
});

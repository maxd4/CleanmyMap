import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "../data-contract";
import {
  resolveCurrentPlaceStates,
  resolveCurrentPlaceStateForRecord,
  resolveCurrentPlaceStateViews,
  type CurrentPlaceState,
} from "./current-place-state";
import type { ActionDrawing } from "../types";

function dateAt(day: number): string {
  return new Date(Date.UTC(2026, 0, 1 + day)).toISOString();
}

function coordinateOffset(
  latitude: number,
  longitude: number,
  meters: number,
): [number, number] {
  return [latitude + meters / 111_111, longitude];
}

function buildRecord(params: {
  id: string;
  type?: "action" | "spot" | "clean_place";
  day?: number;
  latitude?: number;
  longitude?: number;
  label?: string;
  geometryKind?: "point" | "polygon" | "polyline";
  observedPollutionScore?: number | null;
  postActionPollutionScore?: number | null;
}): ReturnType<typeof buildActionDataContract> {
  const type = params.type ?? "action";
  const latitude = params.latitude ?? 48.8566;
  const longitude = params.longitude ?? 2.3522;
  const geometryKind = params.geometryKind ?? "point";
  const manualDrawing: ActionDrawing | null =
    geometryKind === "point"
      ? null
      : {
          kind: geometryKind,
          coordinates:
            geometryKind === "polygon"
              ? [
                  [latitude, longitude],
                  [latitude + 0.0001, longitude],
                  [latitude, longitude + 0.0001],
                ]
              : [
                  [latitude, longitude],
                  [latitude + 0.001, longitude + 0.001],
                ],
        };

  return buildActionDataContract({
    id: params.id,
    type,
    status: "approved",
    source: type === "action" ? "actions" : "trash_spotter_spots",
    observedAt: dateAt(params.day ?? 0),
    createdAt: dateAt(params.day ?? 0),
    locationLabel: params.label ?? "Parc test",
    latitude,
    longitude,
    wasteKg: 0,
    cigaretteButts: 0,
    volunteersCount: 1,
    durationMinutes: 10,
    actionPhase: "post_action_complete",
    manualDrawing,
    observedPollutionScore: params.observedPollutionScore,
    postActionPollutionScore: params.postActionPollutionScore,
  });
}

function resolve(records: readonly ReturnType<typeof buildRecord>[], scores: Record<string, number>) {
  return resolveCurrentPlaceStates(records, {
    asOf: dateAt(90),
    sourceCompleteness: "complete",
    historicalScoreResolver: (record) => scores[record.id] ?? 0,
  });
}

function onlyState(states: readonly CurrentPlaceState[]): CurrentPlaceState {
  expect(states).toHaveLength(1);
  return states[0];
}

function resolveViews(
  records: readonly ReturnType<typeof buildRecord>[],
  scores: Record<string, number>,
) {
  return resolveCurrentPlaceStateViews(records, {
    asOf: dateAt(90),
    sourceCompleteness: "complete",
    historicalScoreResolver: (record) => scores[record.id] ?? 0,
  });
}

describe("current place state resolver", () => {
  it("resolves observed and projected-today views from the same action", () => {
    const action = buildRecord({ id: "action-history", day: 0 });
    const views = resolveViews([action], { "action-history": 70 });

    expect(views).toHaveLength(1);
    expect(views[0].observed?.source).toBe("observed");
    expect(views[0].observed?.score).toBe(70);
    expect(views[0].observed?.scoreKind).toBe("measured");
    expect(views[0].projectedToday?.source).toBe("projected");
    expect(views[0].projectedToday?.score).toBeGreaterThan(0);
    expect(views[0].projectedToday?.score).toBeLessThan(70);
  });

  it("uses a measured S_post for Observed without presenting the model baseline", () => {
    const action = buildRecord({
      id: "action-measured-post",
      day: 0,
      postActionPollutionScore: 18,
    });
    const views = resolveViews([action], { "action-measured-post": 70 });

    expect(views[0].observed?.score).toBe(18);
    expect(views[0].observed?.scoreKind).toBe("measured");
    expect(views[0].observed?.provenance).toBe("observed_action");
    expect(views[0].projectedToday?.score).toBeGreaterThan(18);
  });

  it("keeps the historical observation in Observed when S_post is absent", () => {
    const action = buildRecord({ id: "action-no-post", day: 0 });
    const views = resolveViews([action], { "action-no-post": 70 });

    expect(views[0].observed?.score).toBe(70);
    expect(views[0].observed?.score).not.toBe(0);
    expect(views[0].observed?.provenance).toBe("observed_action");
  });

  it("keeps qualitative Trash Spotter and clean_place explicit in both views", () => {
    const qualitative = buildRecord({
      id: "spot-qualitative",
      type: "spot",
      day: 40,
    });
    const cleanPlace = buildRecord({
      id: "clean-place",
      type: "clean_place",
      day: 40,
      label: "Place propre",
      latitude: 48.8576,
    });

    const views = resolveViews([qualitative, cleanPlace], {});
    const qualitativeView = views.find((view) =>
      view.observed?.recordId === "spot-qualitative",
    );
    const cleanView = views.find((view) => view.observed?.recordId === "clean-place");

    expect(qualitativeView?.observed?.score).toBeNull();
    expect(qualitativeView?.projectedToday?.score).toBeNull();
    expect(qualitativeView?.observed?.stateLabel).toBe(
      "Pollution observée · niveau non quantifié",
    );
    expect(cleanView?.observed?.isExplicitlyClean).toBe(true);
    expect(cleanView?.projectedToday?.isExplicitlyClean).toBe(true);
  });

  it("lets a more recent field observation win over the projected view", () => {
    const action = buildRecord({ id: "action-history", day: 0 });
    const spot = buildRecord({
      id: "spot-recent",
      type: "spot",
      day: 40,
      observedPollutionScore: 61,
    });
    const views = resolveViews([action, spot], { "action-history": 70 });

    expect(views[0].projectedToday?.source).toBe("observed");
    expect(views[0].projectedToday?.recordId).toBe("spot-recent");
    expect(views[0].projectedToday?.score).toBe(61);
  });

  it("does not match a point observation onto a polyline", () => {
    const route = buildRecord({
      id: "route-history",
      day: 0,
      geometryKind: "polyline",
    });
    const spot = buildRecord({ id: "spot-on-route", type: "spot", day: 40 });
    const views = resolveViews([route, spot], {});

    expect(resolveCurrentPlaceStateForRecord(views, "route-history", "observed")).toBeNull();
    expect(resolveCurrentPlaceStateForRecord(views, "route-history", "projected_today")).toBeNull();
    expect(resolveCurrentPlaceStateForRecord(views, "spot-on-route", "observed")?.recordId).toBe(
      "spot-on-route",
    );
  });

  it.each([
    ["higher", 20, 80],
    ["lower", 80, 20],
  ])(
    "lets a recent quantitative action replace the projection in the %s direction",
    (_direction, previousScore, currentScore) => {
      const previous = buildRecord({ id: "action-previous", day: 0 });
      const current = buildRecord({ id: "action-current", day: 40 });

      const state = onlyState(
        resolve([previous, current], {
          "action-previous": previousScore,
          "action-current": currentScore,
        }),
      );

      expect(state.source).toBe("observed");
      expect(state.score).toBe(currentScore);
      expect(state.scoreKind).toBe("measured");
      expect(state.recordId).toBe("action-current");
      expect(state.historicalActions.map((record) => record.id)).toEqual([
        "action-previous",
        "action-current",
      ]);
    },
  );

  it("keeps a qualitative Trash Spotter observation unquantified", () => {
    const action = buildRecord({ id: "action-history", day: 0 });
    const spot = buildRecord({
      id: "spot-qualitative",
      type: "spot",
      day: 40,
    });

    const state = onlyState(resolve([spot, action], { "action-history": 70 }));

    expect(state.source).toBe("observed");
    expect(state.score).toBeNull();
    expect(state.scoreKind).toBe("unavailable");
    expect(state.stateLabel).toBe("Pollution observée · niveau non quantifié");
    expect(state.provenance).toBe("observed_trash_spotter");
  });

  it("resolves a recent clean_place as explicitly clean without a score", () => {
    const action = buildRecord({ id: "action-history", day: 0 });
    const cleanPlace = buildRecord({
      id: "clean-place",
      type: "clean_place",
      day: 40,
    });

    const state = onlyState(
      resolve([action, cleanPlace], { "action-history": 70 }),
    );

    expect(state.source).toBe("observed");
    expect(state.isExplicitlyClean).toBe(true);
    expect(state.score).toBeNull();
    expect(state.scoreKind).toBe("unavailable");
    expect(state.stateLabel).toBe("Lieu explicitement propre");
    expect(state.provenance).toBe("observed_clean_place");
  });

  it("ignores an observation older than the latest action and keeps the projection", () => {
    const action = buildRecord({ id: "action-history", day: 0 });
    const oldSpot = buildRecord({
      id: "spot-old",
      type: "spot",
      day: -10,
      observedPollutionScore: 99,
    });

    const state = onlyState(resolve([oldSpot, action], { "action-history": 70 }));

    expect(state.source).toBe("projected");
    expect(state.scoreKind).toBe("projected");
    expect(state.recordId).toBe("action-history");
    expect(state.historicalActions.map((record) => record.id)).toEqual([
      "action-history",
    ]);
  });

  it("uses a quantified future Trash Spotter contract score without changing persistence", () => {
    const action = buildRecord({ id: "action-history", day: 0 });
    const spot = buildRecord({
      id: "spot-quantified",
      type: "spot",
      day: 40,
      observedPollutionScore: 61,
    });

    const state = onlyState(resolve([action, spot], { "action-history": 70 }));

    expect(state.score).toBe(61);
    expect(state.scoreKind).toBe("measured");
    expect(state.recordSource).toBe("trash_spotter_spots");
  });

  it("falls back to an action projection and preserves the historical action", () => {
    const action = buildRecord({ id: "action-history", day: 0 });
    const state = onlyState(resolve([action], { "action-history": 70 }));

    expect(state.source).toBe("projected");
    expect(state.historicalAction?.id).toBe("action-history");
    expect(state.lastActionDate).toBe(action.dates.observedAt);
    expect(state.date).toBe(action.dates.observedAt);
  });

  it("keeps incompatible locations as separate places even with identical labels", () => {
    const action = buildRecord({ id: "action-history", day: 0, label: "Parc test" });
    const distantSpot = buildRecord({
      id: "spot-distant",
      type: "spot",
      day: 40,
      label: "Parc test",
      ...(() => {
        const [latitude, longitude] = coordinateOffset(48.8566, 2.3522, 100);
        return { latitude, longitude };
      })(),
    });

    const states = resolve([distantSpot, action], { "action-history": 70 });

    expect(states).toHaveLength(2);
    expect(states.map((state) => state.recordId).sort()).toEqual([
      "action-history",
      "spot-distant",
    ]);
  });

  it("does not let a point Trash Spotter record recolor a polyline route", () => {
    const route = buildRecord({
      id: "route-history",
      day: 0,
      geometryKind: "polyline",
    });
    const spot = buildRecord({
      id: "spot-on-route",
      type: "spot",
      day: 40,
    });

    const states = resolve([route, spot], { "route-history": 85 });

    expect(states).toHaveLength(1);
    expect(states[0].recordId).toBe("spot-on-route");
    expect(states[0].source).toBe("observed");
    expect(states[0].historicalActions).toHaveLength(0);
  });

  it("is deterministic regardless of source input order", () => {
    const action = buildRecord({ id: "action-history", day: 0 });
    const spot = buildRecord({ id: "spot-later", type: "spot", day: 40 });
    const scores = { "action-history": 70 };

    const forward = resolve([action, spot], scores);
    const reversed = resolve([spot, action], scores);

    expect(reversed).toEqual(forward);
  });
});

import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "./data-contract";
import type { ActionDrawing } from "./types";
import {
  ACTION_POLLUTION_PROJECTION_CONSTANTS,
  projectedPollutionScore,
} from "./revisit-priority";
import { resolveProjectionConfidence } from "./projection-confidence";
import {
  LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS,
  areDerivedPlaceLabelsCompatible,
  canMergeDerivedPlaceObservations,
  deriveLocalRepollutionHistories,
  distanceBetweenCoordinatesMeters,
  normalizeDerivedPlaceLabel,
  presentActionPollutionProjectionWithLocalHistory,
  projectActionPollutionScoreWithLocalHistory,
  selectLocalActionProjectionCalibration,
} from "./local-repollution-calibration";

const DAY_MS = 24 * 60 * 60 * 1000;

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

function buildAction(params: {
  id: string;
  day?: number;
  latitude?: number;
  longitude?: number;
  label?: string;
  geometryKind?: "point" | "polygon" | "polyline";
  status?: "pending" | "approved" | "rejected";
  actionPhase?: "pre_action" | "post_action_draft" | "post_action_complete";
  postActionPollutionScore?: number | null;
}) {
  const geometryKind = params.geometryKind ?? "point";
  const latitude = params.latitude ?? 48.8566;
  const longitude = params.longitude ?? 2.3522;
  const manualDrawing: ActionDrawing | null =
    geometryKind === "point"
      ? null
      : {
          kind: geometryKind,
          coordinates:
            geometryKind === "polygon"
              ? ([
                  [latitude, longitude],
                  [latitude + 0.0001, longitude],
                  [latitude, longitude + 0.0001],
                ] as [number, number][])
              : ([
                  [latitude, longitude],
                  [latitude + 0.0001, longitude + 0.0001],
                ] as [number, number][]),
        };

  return buildActionDataContract({
    id: params.id,
    type: "action",
    status: params.status ?? "approved",
    source: "actions",
    sourceStatus: params.status ?? "approved",
    observedAt: dateAt(params.day ?? 0),
    createdAt: dateAt(params.day ?? 0),
    validatedAt: dateAt(params.day ?? 0),
    locationLabel: params.label ?? "Lieu test",
    latitude,
    longitude,
    wasteKg: 0,
    cigaretteButts: 0,
    postActionPollutionScore: params.postActionPollutionScore,
    volunteersCount: 1,
    durationMinutes: 10,
    actorName: "Testeur",
    actionPhase: params.actionPhase ?? "post_action_complete",
    manualDrawing,
  });
}

function derive(
  actions: ReturnType<typeof buildAction>[],
  scores: Record<string, number>,
  sourceCompleteness: "complete" | "partial" = "complete",
) {
  return deriveLocalRepollutionHistories(actions, {
    sourceCompleteness,
    historicalScoreResolver: (action) => scores[action.id] ?? 0,
  });
}

function buildSequence(t80Days: number[]): {
  actions: ReturnType<typeof buildAction>[];
  scores: Record<string, number>;
} {
  const actions = [buildAction({ id: "action-0", day: 0 })];
  const scores: Record<string, number> = { "action-0": 100 };
  let currentScore = 100;
  let currentDay = 0;

  t80Days.forEach((t80, index) => {
    const deltaDays = 40;
    currentDay += deltaDays;
    currentScore = projectedPollutionScore(currentScore, deltaDays, {
      calibration: { t80Days: t80 },
    });
    const id = `action-${index + 1}`;
    actions.push(buildAction({ id, day: currentDay }));
    scores[id] = currentScore;
  });

  return { actions, scores };
}

describe("local repollution calibration", () => {
  it("uses <=20m as a spatial match without requiring compatible labels", () => {
    const left = buildAction({ id: "left", label: "Parc A" });
    const right = buildAction({
      id: "right",
      latitude: coordinateOffset(48.8566, 2.3522, 19)[0],
      label: "Gare B",
    });

    expect(distanceBetweenCoordinatesMeters(
      { latitude: left.location.latitude!, longitude: left.location.longitude! },
      { latitude: right.location.latitude!, longitude: right.location.longitude! },
    )).toBeLessThanOrEqual(LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.nearDistanceMeters);
    expect(
      canMergeDerivedPlaceObservations(
        {
          latitude: left.location.latitude!,
          longitude: left.location.longitude!,
          normalizedLabel: normalizeDerivedPlaceLabel(left.location.label),
        },
        {
          latitude: right.location.latitude!,
          longitude: right.location.longitude!,
          normalizedLabel: normalizeDerivedPlaceLabel(right.location.label),
        },
      ),
    ).toBe(true);
  });

  it("requires compatible normalized labels between 20m and 60m", () => {
    expect(areDerivedPlaceLabelsCompatible("Parc du Luxembourg", "Parc Luxembourg")).toBe(true);
    expect(areDerivedPlaceLabelsCompatible("Parc du Luxembourg", "Gare du Nord")).toBe(false);

    const compatible = derive(
      [
        buildAction({ id: "first", label: "Parc du Luxembourg" }),
        buildAction({
          id: "second",
          latitude: coordinateOffset(48.8566, 2.3522, 40)[0],
          label: "Parc Luxembourg",
        }),
      ],
      { first: 50, second: 40 },
    );
    const incompatible = derive(
      [
        buildAction({ id: "first", label: "Parc du Luxembourg" }),
        buildAction({
          id: "second",
          latitude: coordinateOffset(48.8566, 2.3522, 40)[0],
          label: "Gare du Nord",
        }),
      ],
      { first: 50, second: 40 },
    );

    expect(compatible.places).toHaveLength(1);
    expect(incompatible.places).toHaveLength(2);
  });

  it("never merges beyond 60m, even when labels are identical", () => {
    const result = derive(
      [
        buildAction({ id: "first", label: "Parc du Luxembourg" }),
        buildAction({
          id: "second",
          latitude: coordinateOffset(48.8566, 2.3522, 61)[0],
          label: "Parc du Luxembourg",
        }),
      ],
      { first: 50, second: 40 },
    );

    expect(result.places).toHaveLength(2);
  });

  it("is deterministic, excludes polylines and only accepts completed valid actions", () => {
    const actions = [
      buildAction({ id: "second", day: 20 }),
      buildAction({ id: "first", day: 0 }),
      buildAction({ id: "route", geometryKind: "polyline" }),
      buildAction({ id: "pending", status: "pending" }),
      buildAction({ id: "draft", actionPhase: "post_action_draft" }),
    ];
    const scores = { first: 50, second: 40, route: 80, pending: 70, draft: 70 };
    const forward = derive(actions, scores);
    const reversed = derive([...actions].reverse(), scores);

    expect(forward.places).toHaveLength(1);
    expect(forward.places[0].observations.map((item) => item.actionId)).toEqual([
      "first",
      "second",
    ]);
    expect(forward.places.map((place) => place.derivedPlaceKey)).toEqual(
      reversed.places.map((place) => place.derivedPlaceKey),
    );
    expect(forward.excludedActions).toEqual([
      { actionId: "draft", reason: "not_completed" },
      { actionId: "pending", reason: "not_completed" },
      { actionId: "route", reason: "unsupported_geometry" },
    ]);
  });

  it("sorts observations chronologically and computes the inverse T80", () => {
    const result = derive(
      [
        buildAction({ id: "next", day: 40 }),
        buildAction({ id: "previous", day: 0 }),
      ],
      { previous: 100, next: 80 },
    );
    const interval = result.places[0].intervals[0];

    expect(result.places[0].observations.map((item) => item.actionId)).toEqual([
      "previous",
      "next",
    ]);
    expect(interval.deltaDays).toBe(40);
    expect(interval.fraction).toBeCloseTo(0.8, 10);
    expect(interval.observedT80Days).toBeCloseTo(40, 8);
    expect(interval.status).toBe("valid");
  });

  it("keeps short, saturated and unusable intervals separate", () => {
    const short = derive(
      [buildAction({ id: "a", day: 0 }), buildAction({ id: "b", day: 6 })],
      { a: 50, b: 20 },
    );
    const rapid = derive(
      [buildAction({ id: "a", day: 0 }), buildAction({ id: "b", day: 6 })],
      { a: 50, b: 60 },
    );
    const denominator = derive(
      [
        buildAction({ id: "a", day: 0, postActionPollutionScore: 50 }),
        buildAction({ id: "b", day: 10 }),
      ],
      { a: 50, b: 40 },
    );

    expect(short.places[0].calibration.rejectedIntervals[0].rejectionReason).toBe(
      "delta_days_too_short",
    );
    expect(rapid.places[0].calibration.rapidRepollutionIntervals).toHaveLength(1);
    expect(rapid.places[0].intervals[0].status).toBe("rapid_repollution");
    expect(denominator.places[0].calibration.rejectedIntervals[0].rejectionReason).toBe(
      "denominator_unusable",
    );
  });

  it("uses measured post-action scores and a robust median for multiple intervals", () => {
    const measured = derive(
      [
        buildAction({ id: "previous", day: 0, postActionPollutionScore: 20 }),
        buildAction({ id: "next", day: 40 }),
      ],
      { previous: 50, next: 44 },
    );
    expect(measured.places[0].intervals[0].postActionScore).toBe(20);
    expect(measured.places[0].intervals[0].postActionScoreSource).toBe("measured");

    const sequence = buildSequence([20, 40, 300]);
    const result = derive(sequence.actions, sequence.scores);
    expect(result.places[0].calibration.validIntervalsCount).toBe(3);
    expect(result.places[0].calibration.localT80Days).toBeCloseTo(40, 5);
  });

  it("applies confidence thresholds and requires two valid intervals to override", () => {
    const one = buildSequence([40]);
    const two = buildSequence([40, 40]);
    const four = buildSequence([40, 40, 40, 40]);
    const oneCalibration = derive(one.actions, one.scores).places[0].calibration;
    const twoCalibration = derive(two.actions, two.scores).places[0].calibration;
    const fourCalibration = derive(four.actions, four.scores).places[0].calibration;

    expect(oneCalibration.confidence).toBe("low");
    expect(oneCalibration.provenance).toBe("generic");
    expect(twoCalibration.confidence).toBe("medium");
    expect(twoCalibration.provenance).toBe("local_history");
    expect(fourCalibration.confidence).toBe("high");

    expect(selectLocalActionProjectionCalibration(oneCalibration, "complete").provenance).toBe(
      "generic",
    );
    const selectedCalibration = selectLocalActionProjectionCalibration(
      twoCalibration,
      "complete",
    );
    expect(selectedCalibration.provenance).toBe("local_history");
    expect(selectedCalibration.calibration?.t80Days).toBeCloseTo(40, 10);
  });

  it("keeps local_history activation independent from descriptive confidence thresholds", () => {
    const sequence = buildSequence([40, 40]);
    const calibration = derive(sequence.actions, sequence.scores).places[0].calibration;
    const selection = selectLocalActionProjectionCalibration(calibration, "complete");
    const descriptiveConfidence = resolveProjectionConfidence({
      geometryConfidence: 0.58,
      postActionScoreSource: "model_baseline",
      localCalibration: calibration,
      sourceCompleteness: "complete",
    });

    expect(calibration.provenance).toBe("local_history");
    expect(selection.provenance).toBe("local_history");
    expect(descriptiveConfidence.level).toBe("low");
    expect(descriptiveConfidence.factors.localHistory).toBe("sufficient");
  });

  it("keeps incomplete datasets on the generic fallback and never learns from them", () => {
    const sequence = buildSequence([40, 40]);
    const result = derive(sequence.actions, sequence.scores, "partial");
    const calibration = result.places[0].calibration;

    expect(calibration.sourceCompleteness).toBe("partial");
    expect(calibration.validIntervalsCount).toBe(0);
    expect(calibration.localT80Days).toBeNull();
    expect(calibration.provenance).toBe("generic");
    expect(
      projectActionPollutionScoreWithLocalHistory(80, 40, {
        sourceCompleteness: "partial",
        localCalibration: calibration,
      }),
    ).toBe(projectedPollutionScore(80, 40));
  });

  it("uses local history only for complete datasets and does not double-count elapsed time", () => {
    const sequence = buildSequence([40, 40]);
    const calibration = derive(sequence.actions, sequence.scores).places[0].calibration;
    const projected = presentActionPollutionProjectionWithLocalHistory(
      80,
      dateAt(0),
      dateAt(40),
      {
        sourceCompleteness: "complete",
        localCalibration: calibration,
        postActionScore: 12,
        geometryConfidence: 1,
      },
    );

    expect(projected.provenance).toBe("local_history");
    expect(projected.t80Days).toBeCloseTo(40, 5);
    expect(projected.elapsedDays).toBe(40);
    expect(projected.projectionConfidence.level).toBe("high");
    expect(projected.projectedPollutionScore).toBeCloseTo(
      projectedPollutionScore(80, 40, {
        postActionScore: 12,
        calibration: { t80Days: 40 },
      }),
      8,
    );
  });

  it("uses the canonical projection target and central distance thresholds", () => {
    expect(ACTION_POLLUTION_PROJECTION_CONSTANTS.targetFraction).toBe(0.8);
    expect(LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumIntervalDays).toBe(7);
    expect(LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumT80Days).toBe(7);
    expect(LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.maximumT80Days).toBe(365);
    expect(DAY_MS).toBe(86_400_000);
  });
});

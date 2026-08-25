import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "./data-contract";
import { projectedPollutionScore } from "./revisit-priority";
import {
  evaluateRepollutionPredictionBeforeObservation,
  REPOLLUTION_EVALUATION_MODEL_VERSION,
  summarizeRepollutionPredictionEvaluations,
} from "./repollution-prediction-evaluation";

function dateAt(day: number): string {
  return new Date(Date.UTC(2026, 0, 1 + day)).toISOString();
}

function buildObservation(params: {
  id: string;
  day: number;
  score?: number;
  type?: "action" | "spot";
  latitude?: number;
  longitude?: number;
}) {
  return buildActionDataContract({
    id: params.id,
    type: params.type ?? "action",
    status: "approved",
    source: params.type === "spot" ? "trash_spotter_spots" : "actions",
    observedAt: dateAt(params.day),
    createdAt: dateAt(params.day),
    locationLabel: "Lieu test",
    latitude: params.latitude ?? 48.8566,
    longitude: params.longitude ?? 2.3522,
    wasteKg: 0,
    cigaretteButts: 0,
    volunteersCount: 1,
    durationMinutes: 10,
    actionPhase: "post_action_complete",
  });
}

function evaluate(
  newObservation: ReturnType<typeof buildObservation>,
  previousObservations: ReturnType<typeof buildObservation>[],
  historyCompleteness: "complete" | "partial" = "complete",
  scoreOverrides: Record<string, number> = {},
) {
  const scores = new Map<string, number>([
    ["previous", 100],
    ["previous-2", 80],
    ["previous-3", 64],
    ["new", 80],
    ["future", 10],
    ...Object.entries(scoreOverrides),
  ]);
  return evaluateRepollutionPredictionBeforeObservation({
    newObservation,
    previousObservations,
    historyCompleteness,
    historicalScoreResolver: (observation) => scores.get(observation.id) ?? 0,
    model: { version: REPOLLUTION_EVALUATION_MODEL_VERSION },
  });
}

describe("repollution prediction evaluation", () => {
  it("does not fabricate an evaluation when there is no repeated history", () => {
    const result = evaluate(buildObservation({ id: "new", day: 40 }), []);

    expect(result).toEqual({
      status: "not_evaluable",
      observationType: "action",
      observationId: "new",
      observedAt: dateAt(40).slice(0, 10),
      reason: "insufficient_history",
    });
  });

  it("excludes the new and future observations from the frozen prediction", () => {
    const previous = buildObservation({ id: "previous", day: 0 });
    const current = buildObservation({ id: "new", day: 40 });
    const future = buildObservation({ id: "future", day: 80 });
    const result = evaluate(current, [future, current, previous]);

    expect(result.status).toBe("evaluable");
    if (result.status !== "evaluable") return;

    expect(result.evaluation.previousObservationId).toBe("previous");
    expect(result.evaluation.evaluationObservationId).toBe("new");
    expect(result.evaluation.elapsedDays).toBe(40);
    expect(result.evaluation.projectedScore).toBeCloseTo(
      projectedPollutionScore(100, 40),
      10,
    );
    expect(result.evaluation.modelSnapshot.used).toMatchObject({
      t80Days: result.evaluation.t80Days,
    });
  });

  it("reports positive and negative signed errors without percentages", () => {
    const previous = buildObservation({ id: "previous", day: 0 });
    const positive = evaluate(
      buildObservation({ id: "new", day: 40 }),
      [previous],
      "complete",
      { new: 95 },
    );
    const negative = evaluate(
      buildObservation({ id: "new", day: 20 }),
      [previous],
      "complete",
      { new: 20 },
    );

    expect(positive.status).toBe("evaluable");
    expect(negative.status).toBe("evaluable");
    if (positive.status !== "evaluable" || negative.status !== "evaluable") {
      return;
    }

    expect(positive.evaluation.signedError).toBeGreaterThan(0);
    expect(negative.evaluation.signedError).toBeLessThan(0);
    expect(negative.evaluation.absoluteError).toBe(
      Math.abs(negative.evaluation.signedError),
    );
  });

  it("uses an explicit score resolver to verify under- and over-estimation", () => {
    const previous = buildObservation({ id: "previous", day: 0 });
    const current = buildObservation({ id: "new", day: 40 });
    const projected = projectedPollutionScore(100, 40);
    const under = evaluateRepollutionPredictionBeforeObservation({
      newObservation: current,
      previousObservations: [previous],
      historyCompleteness: "complete",
      historicalScoreResolver: (observation) =>
        observation.id === "new" ? projected + 10 : 100,
    });
    const over = evaluateRepollutionPredictionBeforeObservation({
      newObservation: current,
      previousObservations: [previous],
      historyCompleteness: "complete",
      historicalScoreResolver: (observation) =>
        observation.id === "new" ? projected - 10 : 100,
    });

    expect(under.status).toBe("evaluable");
    expect(over.status).toBe("evaluable");
    if (under.status !== "evaluable" || over.status !== "evaluable") return;
    expect(under.evaluation.signedError).toBeGreaterThan(0);
    expect(over.evaluation.signedError).toBeLessThan(0);
  });

  it("keeps Trash Spotter without a canonical quantitative score non-evaluable", () => {
    const result = evaluate(buildObservation({ id: "spot", day: 40, type: "spot" }), [
      buildObservation({ id: "previous", day: 0 }),
    ]);

    expect(result.status).toBe("not_evaluable");
    if (result.status === "not_evaluable") {
      expect(result.reason).toBe("observation_unscored");
    }
  });

  it("leaves a resolver seam for a future canonically quantified Trash Spotter", () => {
    const result = evaluateRepollutionPredictionBeforeObservation({
      newObservation: buildObservation({ id: "spot", day: 40, type: "spot" }),
      previousObservations: [buildObservation({ id: "previous", day: 0 })],
      historyCompleteness: "complete",
      historicalScoreResolver: (observation) =>
        observation.id === "previous" ? 100 : 0,
      quantitativeScoreResolver: () => 80,
    });

    expect(result.status).toBe("evaluable");
    if (result.status === "evaluable") {
      expect(result.evaluation.evaluationObservationType).toBe("spot");
    }
  });

  it("does not merge a different place and stays explicit about the absence of history", () => {
    const result = evaluate(
      buildObservation({ id: "new", day: 40, latitude: 48.858 }),
      [buildObservation({ id: "previous", day: 0 })],
    );

    expect(result.status).toBe("not_evaluable");
    if (result.status === "not_evaluable") {
      expect(result.reason).toBe("place_not_matchable");
    }
  });

  it("uses local calibration only from complete prior history", () => {
    const previous = [
      buildObservation({ id: "previous", day: 0 }),
      buildObservation({ id: "previous-2", day: 40 }),
      buildObservation({ id: "previous-3", day: 80 }),
    ];
    const current = buildObservation({ id: "new", day: 120 });
    const complete = evaluate(current, previous, "complete");
    const partial = evaluate(current, previous, "partial");

    expect(complete.status).toBe("evaluable");
    expect(partial.status).toBe("evaluable");
    if (complete.status !== "evaluable" || partial.status !== "evaluable") return;

    expect(complete.evaluation.projectionProvenance).toBe("local_history");
    expect(complete.evaluation.calibrationConfidence).toBe("medium");
    expect(partial.evaluation.projectionProvenance).toBe("generic");
    expect(partial.evaluation.calibrationConfidence).toBe("insufficient");
  });

  it("is deterministic regardless of input order and ignores future chronology", () => {
    const previous = buildObservation({ id: "previous", day: 0 });
    const current = buildObservation({ id: "new", day: 40 });
    const future = buildObservation({ id: "future", day: 80 });
    const first = evaluate(current, [future, previous]);
    const second = evaluate(current, [previous, future]);

    expect(second).toEqual(first);
  });

  it("returns insufficient_data until evaluable results exist and aggregates metrics", () => {
    const empty = summarizeRepollutionPredictionEvaluations([]);
    expect(empty).toEqual({
      status: "insufficient_data",
      sampleCount: 0,
      mae: null,
      rmse: null,
      bias: null,
    });

    const previous = buildObservation({ id: "previous", day: 0 });
    const first = evaluate(
      buildObservation({ id: "new", day: 40 }),
      [previous],
      "complete",
      { new: 90 },
    );
    const second = evaluate(
      buildObservation({ id: "new-2", day: 80 }),
      [previous],
      "complete",
      { "new-2": 80 },
    );
    expect(first.status).toBe("evaluable");
    expect(second.status).toBe("evaluable");
    const aggregate = summarizeRepollutionPredictionEvaluations([first, second]);
    expect(aggregate.status).toBe("ok");
    expect(aggregate.sampleCount).toBe(2);
    if (first.status !== "evaluable" || second.status !== "evaluable") return;
    const errors = [first.evaluation, second.evaluation];
    expect(aggregate.mae).toBeCloseTo(
      errors.reduce((sum, item) => sum + item.absoluteError, 0) / 2,
      10,
    );
    expect(aggregate.rmse).toBeCloseTo(
      Math.sqrt(errors.reduce((sum, item) => sum + item.squaredError, 0) / 2),
      10,
    );
    expect(aggregate.bias).toBeCloseTo(
      errors.reduce((sum, item) => sum + item.signedError, 0) / 2,
      10,
    );
  });
});

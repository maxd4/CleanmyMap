import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "./data-contract";
import {
  CORRIDOR_HISTORY_CONSTANTS,
  groupActionsByCorridor,
  matchCorridorPolylines,
  summarizeCorridorHistory,
} from "./corridor-history";

function dateAt(day: number): string {
  return new Date(Date.UTC(2026, 0, 1 + day)).toISOString();
}

function buildAction(params: {
  id: string;
  day?: number;
  label?: string;
  coordinates: [number, number][];
  wasteKg?: number;
  cigaretteButts?: number;
  volunteersCount?: number;
  durationMinutes?: number;
}) {
  return buildActionDataContract({
    id: params.id,
    type: "action",
    status: "approved",
    source: "actions",
    observedAt: dateAt(params.day ?? 0),
    createdAt: dateAt(params.day ?? 0),
    locationLabel: params.label ?? "Quai récurrent",
    latitude: params.coordinates[0]?.[0] ?? 48.8566,
    longitude: params.coordinates[0]?.[1] ?? 2.3522,
    manualDrawing: {
      kind: "polyline",
      coordinates: params.coordinates,
    },
    wasteKg: params.wasteKg ?? 0,
    cigaretteButts: params.cigaretteButts ?? 0,
    volunteersCount: params.volunteersCount ?? 1,
    durationMinutes: params.durationMinutes ?? 30,
    actionPhase: "post_action_complete",
  });
}

const verticalCorridor: [number, number][] = [
  [48.856, 2.352],
  [48.857, 2.352],
  [48.858, 2.352],
];

describe("corridor history", () => {
  it("keeps one action as a non-recurring history", () => {
    const [history] = groupActionsByCorridor([
      buildAction({ id: "action-only", coordinates: verticalCorridor }),
    ]);

    expect(history.actions.map((action) => action.id)).toEqual(["action-only"]);
    expect(history.calibrationInput.derivedCorridorKey).toBe(
      history.derivedCorridorKey,
    );
    expect(history.sourceGeometries[0]?.coordinates).toEqual(verticalCorridor);
  });

  it("matches repeated polylines following the same corridor", () => {
    const first = buildAction({ id: "action-old", coordinates: verticalCorridor });
    const recent = buildAction({
      id: "action-new",
      day: 30,
      coordinates: [verticalCorridor[0], verticalCorridor[1]],
    });
    const histories = groupActionsByCorridor([recent, first]);

    expect(histories).toHaveLength(1);
    expect(histories[0].actions.map((action) => action.id)).toEqual([
      "action-new",
      "action-old",
    ]);
    expect(histories[0].sourceGeometries).toHaveLength(2);
    expect(histories[0].calibrationInput.observations).toHaveLength(2);
  });

  it("keeps every grouped source action distinct and losslessly reversible", () => {
    const sourceActions = [
      buildAction({
        id: "action-source-old",
        day: 0,
        coordinates: verticalCorridor,
        wasteKg: 4,
        cigaretteButts: 100,
        volunteersCount: 2,
        durationMinutes: 45,
      }),
      buildAction({
        id: "action-source-middle",
        day: 12,
        coordinates: [
          verticalCorridor[0],
          verticalCorridor[1],
          verticalCorridor[2],
        ],
        wasteKg: 7,
        cigaretteButts: 150,
        volunteersCount: 3,
        durationMinutes: 60,
      }),
      buildAction({
        id: "action-source-new",
        day: 30,
        coordinates: [verticalCorridor[0], verticalCorridor[1]],
        wasteKg: 10,
        cigaretteButts: 200,
        volunteersCount: 4,
        durationMinutes: 90,
      }),
    ];
    const [history] = groupActionsByCorridor(sourceActions);
    const sourceById = new Map(sourceActions.map((action) => [action.id, action]));

    expect(history.actions).toHaveLength(sourceActions.length);
    expect(new Set(history.actions.map((action) => action.id)).size).toBe(
      sourceActions.length,
    );
    expect(history.sourceGeometries.map((geometry) => geometry.actionId).sort()).toEqual(
      sourceActions.map((action) => action.id).sort(),
    );
    expect(history.calibrationInput.observations.map((action) => action.id)).toEqual(
      history.actions.map((action) => action.id),
    );

    for (const sourceAction of sourceActions) {
      expect(sourceById.get(sourceAction.id)).toBe(sourceAction);
      expect(
        history.actions.find((action) => action.id === sourceAction.id),
      ).toBe(sourceAction);
    }
  });

  it("rejects a simple crossing even when the paths share a point", () => {
    const vertical = buildAction({ id: "vertical", coordinates: verticalCorridor });
    const horizontal = buildAction({
      id: "horizontal",
      coordinates: [
        [48.857, 2.3505],
        [48.857, 2.352],
        [48.857, 2.3535],
      ],
    });

    const histories = groupActionsByCorridor([vertical, horizontal]);
    const match = matchCorridorPolylines(
      histories.find((history) => history.actions[0]?.id === "vertical")
        ?.sourceGeometries[0] ?? {
        action: vertical,
        actionId: vertical.id,
        observedAtMs: 0,
        coordinates: vertical.geometry.coordinates,
        lengthMeters: 0,
      },
      {
        action: horizontal,
        actionId: horizontal.id,
        observedAtMs: 0,
        coordinates: horizontal.geometry.coordinates,
        lengthMeters: 0,
      },
    );

    expect(histories).toHaveLength(2);
    expect(match.matches).toBe(false);
    expect(match.overlapRatio).toBeLessThan(
      CORRIDOR_HISTORY_CONSTANTS.minimumOverlapRatio,
    );
  });

  it("does not use identical labels or nearby endpoints without corridor overlap", () => {
    const first = buildAction({
      id: "action-first",
      label: "Parcours identique",
      coordinates: verticalCorridor,
    });
    const distant = buildAction({
      id: "action-distant",
      label: "Parcours identique",
      coordinates: [
        [48.856, 2.354],
        [48.857, 2.354],
        [48.858, 2.354],
      ],
    });

    expect(groupActionsByCorridor([first, distant])).toHaveLength(2);
  });

  it("keeps partial corridor overlap while rejecting unrelated geometry", () => {
    const first = buildAction({ id: "action-first", coordinates: verticalCorridor });
    const partial = buildAction({
      id: "action-partial",
      day: 12,
      coordinates: [
        [48.857, 2.352],
        [48.858, 2.352],
        [48.859, 2.352],
      ],
    });

    const [match] = groupActionsByCorridor([first, partial]);
    expect(match.actions).toHaveLength(2);
  });

  it("builds a deterministic summary with chronological score evolution", () => {
    const oldAction = buildAction({
      id: "action-old",
      day: 0,
      coordinates: verticalCorridor,
      wasteKg: 4,
      cigaretteButts: 100,
      volunteersCount: 2,
      durationMinutes: 60,
    });
    const recentAction = buildAction({
      id: "action-new",
      day: 30,
      coordinates: verticalCorridor,
      wasteKg: 10,
      cigaretteButts: 200,
      volunteersCount: 3,
      durationMinutes: 90,
    });
    const [history] = groupActionsByCorridor([recentAction, oldAction]);
    const summary = summarizeCorridorHistory(history, {
      now: dateAt(60),
    });

    expect(summary.isRecurring).toBe(true);
    expect(summary.actionCount).toBe(2);
    expect(summary.firstActionAt).toBe(oldAction.dates.observedAt);
    expect(summary.lastActionAt).toBe(recentAction.dates.observedAt);
    expect(summary.totalWasteKg).toBe(14);
    expect(summary.totalCigaretteButts).toBe(300);
    expect(summary.totalVolunteers).toBe(5);
    expect(summary.totalDurationMinutes).toBe(150);
    expect(summary.totalEngagementHours).toBe(6.5);
    expect(summary.observedScores.map((entry) => entry.actionId)).toEqual([
      "action-new",
      "action-old",
    ]);
    expect(summary.scoreEvolution?.latest).toBe(summary.observedScores[0]?.score);
    expect(summary.latestProjection?.elapsedDays).toBe(30);
    expect(summary.latestProjection?.projectionConfidence.level).toBe("low");
  });

  it("is deterministic regardless of source input order", () => {
    const first = buildAction({ id: "action-a", coordinates: verticalCorridor });
    const second = buildAction({
      id: "action-b",
      day: 10,
      coordinates: verticalCorridor,
    });

    const forward = groupActionsByCorridor([first, second]);
    const reversed = groupActionsByCorridor([second, first]);

    expect(reversed).toEqual(forward);
  });
});

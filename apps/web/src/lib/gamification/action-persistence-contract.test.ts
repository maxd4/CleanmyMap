import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ActionRow } from "./progression-types";
import { actionRowToDrawing } from "./progression-utils";

const ACTION_ROW: ActionRow = {
  id: "action-contract-test",
  created_at: "2026-08-25T10:00:00.000Z",
  created_by_clerk_id: "user-contract-test",
  actor_name: "Test",
  action_date: "2026-08-25",
  location_label: "Paris",
  latitude: 48.8566,
  longitude: 2.3522,
  waste_kg: 1,
  cigarette_butts: 0,
  volunteers_count: 1,
  duration_minutes: 30,
  status: "approved",
  notes: null,
  derived_geometry_kind: null,
  derived_geometry_geojson: null,
};

describe("Gamification action persistence contract", () => {
  it("does not query the phantom manual_drawing column", () => {
    const progressionSource = readFileSync(
      new URL("./progression-data.ts", import.meta.url),
      "utf8",
    );
    const annualResetSource = readFileSync(
      new URL("./annual-reset.ts", import.meta.url),
      "utf8",
    );

    expect(progressionSource).not.toContain("manual_drawing");
    expect(annualResetSource).not.toContain("manual_drawing");
    expect(progressionSource).toContain("derived_geometry_kind");
    expect(progressionSource).toContain("derived_geometry_geojson");
  });

  it("reconstructs a drawing from persisted derived geometry", () => {
    const drawing = actionRowToDrawing({
      ...ACTION_ROW,
      derived_geometry_kind: "polyline",
      derived_geometry_geojson: JSON.stringify({
        type: "LineString",
        coordinates: [
          [2.3522, 48.8566],
          [2.36, 48.86],
        ],
      }),
    });

    expect(drawing).toEqual({
      kind: "polyline",
      coordinates: [
        [48.8566, 2.3522],
        [48.86, 2.36],
      ],
    });
  });

  it("falls back to the historical drawing serialization in notes", () => {
    const drawing = actionRowToDrawing({
      ...ACTION_ROW,
      notes: [
        "Action de terrain",
        '[DRAWING_GEOJSON]{"kind":"polygon","coordinates":[[48.85,2.35],[48.86,2.36],[48.87,2.35]]}',
      ].join("\n"),
    });

    expect(drawing).toEqual({
      kind: "polygon",
      coordinates: [
        [48.85, 2.35],
        [48.86, 2.36],
        [48.87, 2.35],
      ],
    });
  });
});

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildActionDataContract, toActionMapItem } from "@/lib/actions/data-contract";
import type { ActionDataContract } from "@/lib/actions/contract-model";
import {
  groupActionsByCorridor,
  type CorridorHistory,
} from "@/lib/actions/pollution/corridor-history";
import { CorridorPopupContent } from "./corridor-popup-content";

function dateAt(day: number): string {
  return new Date(Date.UTC(2026, 0, 1 + day)).toISOString();
}

function buildItem(id: string, day: number, wasteKg: number) {
  return toActionMapItem(
    buildActionDataContract({
      id,
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: dateAt(day),
      locationLabel: "Quai récurrent",
      latitude: 48.856,
      longitude: 2.352,
      manualDrawing: {
        kind: "polyline",
        coordinates: [
          [48.856, 2.352],
          [48.857, 2.352],
          [48.858, 2.352],
        ],
      },
      wasteKg,
      cigaretteButts: 100,
      volunteersCount: 2,
      durationMinutes: 60,
      actionPhase: "post_action_complete",
    }),
  );
}

describe("CorridorPopupContent", () => {
  it("renders a compact mobile-friendly tabbed summary and one tab per action", () => {
    const older = buildItem("corridor-old", 1, 4);
    const recent = buildItem("corridor-new", 30, 10);
    const contracts = [older, recent]
      .map((item) => item.contract as unknown as ActionDataContract)
      .filter(Boolean);
    const history = groupActionsByCorridor(contracts)[0] as CorridorHistory;

    const markup = renderToStaticMarkup(
      <CorridorPopupContent
        corridorItems={[recent, older]}
        corridorHistory={history}
        color="hsl(35, 90%, 50%)"
        renderAction={(item) => React.createElement("div", { "data-action-detail": item.id }, "Détail action")}
      />,
    );

    expect(markup).toContain("Parcours récurrent");
    expect(markup).toContain("Synthèse");
    expect(markup).toContain("Action · 31/01/2026");
    expect(markup).toContain("Action · 02/01/2026");
    expect(markup).toContain("Période");
    expect(markup).toContain("Dernière action");
    expect(markup).toContain("Évolution des scores observés");
    expect(markup).toContain("État / projection courant");
    expect(markup).toContain("overflow-x-auto");
    expect(markup).toContain('role="tablist"');
    expect(markup.match(/role="tab"/g)?.length).toBe(3);
  });
});

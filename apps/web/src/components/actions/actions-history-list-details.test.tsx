import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ActionsHistoryListDetailsProps } from "./actions-history-list-details";
import { ActionsHistoryListDetails } from "./actions-history-list-details";

function buildProps(type: "action" | "spot" | "clean_place"): ActionsHistoryListDetailsProps {
  return {
    selectedItem: {
      id: `history-${type}`,
      location_label: "Quai de test",
      contract: {
        type,
        metadata: { placeType: "Quai" },
      },
    },
    selectedQuality: {
      score: 90,
      grade: "A",
      breakdown: { geoloc: 90, traceability: 90, freshness: 90 },
      flags: [],
    },
    selectedOperational: null,
    selectedLostPoints: 10,
    correctiveAction: "Aucune action corrective.",
    selectedCanModerateGroupJoin: false,
    selectedCanViewActionAudit: false,
    pendingGroupJoinRequests: [],
    pendingGroupJoinLoading: false,
    pendingGroupJoinError: null,
    reviewingParticipantId: null,
    actionAudit: { isLoading: false, error: null },
    fr: true,
    onRefreshPending: vi.fn(),
    onReviewGroupJoin: vi.fn(),
  };
}

describe("actions history signalement media entry point", () => {
  it("does not expose a media block for an action", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionsHistoryListDetails, buildProps("action")),
    );

    expect(markup).not.toContain("Preuves terrain");
    expect(markup).not.toContain("Voir les preuves photo");
  });

  it.each(["spot", "clean_place"] as const)(
    "exposes the explicit media control for %s without fetching on selection",
    (type) => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const markup = renderToStaticMarkup(
        React.createElement(ActionsHistoryListDetails, buildProps(type)),
      );

      expect(markup).toContain("Preuves terrain");
      expect(markup).toContain("Voir les preuves photo");
      expect(fetchMock).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    },
  );
});

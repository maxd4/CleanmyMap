import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ActionsHistoryListDetailsProps } from "./actions-history-list-details";
import { ActionsHistoryListDetails } from "./actions-history-list-details";

function buildProps(
  type: "action" | "spot" | "clean_place",
  eligibleForSingleActionReport = false,
): ActionsHistoryListDetailsProps {
  return {
    selectedItem: {
      id: `history-${type}`,
      location_label: "Quai de test",
      status: eligibleForSingleActionReport ? "approved" : null,
      published_at: eligibleForSingleActionReport ? "2026-08-27T10:00:00.000Z" : null,
      record_type: eligibleForSingleActionReport ? "action" : type,
      contract: {
        type,
        metadata: {
          placeType: "Quai",
          actionPhase: eligibleForSingleActionReport ? "post_action_complete" : null,
        },
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

  it("exposes the mono-action report CTA only for an eligible completed action", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        ActionsHistoryListDetails,
        buildProps("action", true),
      ),
    );

    expect(markup).toContain("Générer un rapport d&#x27;impact");
    expect(markup).toContain("/reports?tab=generation&amp;actionId=history-action");
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

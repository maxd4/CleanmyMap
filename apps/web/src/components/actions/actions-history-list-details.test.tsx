import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ActionsHistoryListDetailsProps } from "./actions-history-list-details";
import { ActionsHistoryListDetails } from "./actions-history-list-details";
import { buildActionHistoryAiExportRequest } from "./action-history-ai-report-export";
import { DEFAULT_REPORT_DETAIL_LEVEL, DEFAULT_REPORT_MODULES } from "@/lib/reports/report-pdf-data";
import { DEFAULT_REPORT_PDF_THEME } from "@/lib/pdf-export/report-pdf-theme";

function buildProps(
  type: "action" | "spot" | "clean_place",
  eligibleForSingleActionReport = false,
  canCorrect = false,
): ActionsHistoryListDetailsProps {
  return {
    selectedItem: {
      id: `history-${type}`,
      created_by_clerk_id: canCorrect ? "current-user" : "other-user",
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
    selectedCanCorrectAction: canCorrect,
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
  it("uses the canonical default generation configuration for mono-action AI export", () => {
    expect(buildActionHistoryAiExportRequest("history-action")).toEqual({
      input: { type: "single_action", actionId: "history-action" },
      detailLevel: DEFAULT_REPORT_DETAIL_LEVEL,
      modules: DEFAULT_REPORT_MODULES,
      theme: DEFAULT_REPORT_PDF_THEME,
    });
  });

  it("does not expose a media block for an action", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionsHistoryListDetails, buildProps("action")),
    );

    expect(markup).not.toContain("Preuves terrain");
    expect(markup).not.toContain("Voir les preuves photo");
  });

  it("exposes the Markdown AI export only for an eligible completed action", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        ActionsHistoryListDetails,
        buildProps("action", true),
      ),
    );

    expect(markup).toContain("Exporter les données");
    expect(markup).toContain("Générer le PDF");
    expect(markup).toContain("/reports?tab=generation&amp;actionId=history-action");
  });

  it("does not expose the report export for an action that is not completed and published", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        ActionsHistoryListDetails,
        buildProps("action", false),
      ),
    );

    expect(markup).not.toContain("Exporter les données");
    expect(markup).not.toContain("Générer le PDF");
  });

  it("shows data diagnostics without correction links when edit access is not established", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionsHistoryListDetails, buildProps("action")),
    );

    expect(markup).toContain("Qualité des données");
    expect(markup).toContain("ne la modifiez pas pour améliorer le diagnostic");
    expect(markup).toContain("Limites de preuve géographique");
    expect(markup).not.toContain("Ouvrir le champ concerné");
  });

  it("links an anomaly to the existing editable form only for the creator", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionsHistoryListDetails, buildProps("action", false, true)),
    );

    expect(markup).toContain("/actions/new?actionId=history-action#action-declaration-terrain");
    expect(markup).toContain("Ouvrir le champ concerné");
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

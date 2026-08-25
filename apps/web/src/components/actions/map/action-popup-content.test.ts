import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ActionMapItem } from "@/lib/actions/types";
import { buildActionDataContract, toActionMapItem } from "@/lib/actions/data-contract";
import { ActionPopupContent } from "./action-popup-content";
import { resolveActionTitle } from "./action-popup-content.helpers";
import { ActionPopupContentBody } from "./action-popup-content-body";
import { ActionPopupContentHeader } from "./action-popup-content-header";
import { buildActionUpdateHref } from "./action-popup-content.utils";
import { resolveProjectionConfidence } from "@/lib/actions/projection-confidence";

function buildActionItem(
  preparationData: { actionTitle?: string } | null,
): ActionMapItem {
  return {
    id: "action-1",
    action_date: "2026-04-08",
    location_label: "Quai de test",
    latitude: 48.8566,
    longitude: 2.3522,
    waste_kg: 5,
    cigarette_butts: 42,
    status: "approved",
    created_by_clerk_id: null,
    contract: {
      type: "action",
      location: { label: "Quai de test" },
      metadata: {
        preparationData,
      },
    },
  } as unknown as ActionMapItem;
}

describe("action popup presentation", () => {
  it("keeps the existing single-action popup without corridor tabs", () => {
    const item = toActionMapItem(
      buildActionDataContract({
        id: "single-action",
        type: "action",
        status: "approved",
        source: "actions",
        observedAt: "2026-04-08",
        locationLabel: "Quai de test",
        latitude: 48.8566,
        longitude: 2.3522,
        wasteKg: 5,
        cigaretteButts: 42,
        volunteersCount: 2,
        durationMinutes: 45,
      }),
    );

    const markup = renderToStaticMarkup(
      React.createElement(ActionPopupContent, {
        item,
        color: "hsl(35, 90%, 50%)",
        coords: { latitude: 48.8566, longitude: 2.3522 },
      }),
    );

    expect(markup).not.toContain("Parcours récurrent");
    expect(markup).not.toContain("Synthèse");
    expect(markup).toContain("Déchets collectés");
  });

  it("uses actionTitle and falls back to the location", () => {
    expect(resolveActionTitle(buildActionItem({ actionTitle: "Nettoyage du quai" }))).toBe(
      "Nettoyage du quai",
    );
    expect(resolveActionTitle(buildActionItem({ actionTitle: "  " }))).toBe(
      "Quai de test",
    );
    expect(resolveActionTitle(buildActionItem(null))).toBe("Quai de test");
  });

  it("presents action quantities as collected results without residual-pollution language", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionPopupContentBody, {
        wasteKg: 5,
        butts: 42,
        volunteers: 3,
        durationMinutes: 90,
        operationalEngagementHours: 4.5,
        associationName: null,
        departure: null,
        arrival: null,
        notes: "Bilan",
        observedAt: "08/04/2026",
        sourceLabel: "Source: actions",
        updateHref: "/actions/new?lat=48.8566&lng=2.3522",
        hasPollution: true,
        isAction: true,
      }),
    );

    expect(markup).toContain("Déchets collectés");
    expect(markup).toContain("Mégots collectés");
    expect(markup).toContain("Nouvelle action ici");
    expect(markup).not.toContain("Priorité d'intervention");
    expect(markup).not.toContain("Déclarer une action");
    expect(markup).not.toContain("pollution");
  });

  it("labels observed pollution and revisit priority separately", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionPopupContentHeader, {
        recordTypeLabel: "Action terrain",
        locationLabel: "Quai de test",
        actionTitle: "Nettoyage du quai",
        isAction: true,
        color: "hsl(35, 90%, 50%)",
        score: 42,
        scoreLoading: false,
        scoreReading: {
          label: "Moyen/Fort",
          guidance: "Passage à planifier",
          tone: "amber",
        },
        scoreSourceLabel: "Score observé",
        wasteScore: 42,
        buttsScore: 20,
        statusLabel: "Validée",
        placeType: null,
        quality: null,
        geometryLabel: "Parcours déclaré",
        geometryModeLabel: "Parcours connu",
        geometryPointLabel: "2 points",
        geometryConfidenceLabel: null,
        geometryMetricLabel: "Longueur ~ 1 km",
        geometryReality: "real",
        observedAt: "08/04/2026",
        wasteKg: 5,
        butts: 42,
        actionProjection: {
          historicalScore: 42,
          postActionScore: 0,
          postActionScoreSource: "model_baseline",
          elapsedDays: 47,
          t80Days: 100,
          projectedPollutionScore: 47.2,
          isEstimate: true,
          projectionConfidence: resolveProjectionConfidence({
            geometryConfidence: 0.58,
            postActionScoreSource: "model_baseline",
            sourceCompleteness: "partial",
          }),
        },
      }),
    );

    expect(markup).toContain("Pollution constatée avant l&#x27;action");
    expect(markup).toContain("Temps depuis la dernière action");
    expect(markup).toContain("Pollution projetée");
    expect(markup).toContain("Confiance faible");
    expect(markup).toContain("pas une mesure en temps réel");
    expect(markup).not.toContain("Priorité de revisite");
    expect(markup).not.toContain("pollution actuelle");
  });

  it("offers explicit trace framing when the map provides the action", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionPopupContentBody, {
        wasteKg: 0,
        butts: 0,
        volunteers: 1,
        durationMinutes: 30,
        operationalEngagementHours: 0.5,
        associationName: null,
        departure: null,
        arrival: null,
        notes: null,
        observedAt: "08/04/2026",
        sourceLabel: "Source: actions",
        updateHref: null,
        hasPollution: false,
        isAction: true,
        onViewGeometry: () => undefined,
      }),
    );

    expect(markup).toContain("Voir tout le tracé");
  });
});

describe("buildActionUpdateHref", () => {
  it("returns the action creation url when coordinates are valid", () => {
    expect(buildActionUpdateHref(true, { latitude: 48.8566, longitude: 2.3522 })).toBe(
      "/actions/new?lat=48.8566&lng=2.3522",
    );
  });

  it("adds clean-place mode for non-positive scores", () => {
    expect(buildActionUpdateHref(false, { latitude: 48.8566, longitude: 2.3522 })).toBe(
      "/actions/new?lat=48.8566&lng=2.3522&mode=propre",
    );
  });

  it("does not add clean-place mode for a new action context", () => {
    expect(
      buildActionUpdateHref(false, { latitude: 48.8566, longitude: 2.3522 }, true),
    ).toBe("/actions/new?lat=48.8566&lng=2.3522");
  });

  it("returns null when coordinates are missing", () => {
    expect(buildActionUpdateHref(true, { latitude: null, longitude: 2.3522 })).toBeNull();
    expect(buildActionUpdateHref(true, { latitude: 48.8566, longitude: null })).toBeNull();
  });
});

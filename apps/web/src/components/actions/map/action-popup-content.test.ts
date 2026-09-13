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
import { resolveProjectionConfidence } from "@/lib/actions/pollution/projection-confidence";
import type { ScopedActionPollutionScore } from "./pollution-score-scope";

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
    expect(markup).not.toContain("Voir les preuves photo");
  });

  it.each(["spot", "clean_place"] as const)(
    "offers explicit media access for %s without loading it during popup render",
    (type) => {
      const item = toActionMapItem(
        buildActionDataContract({
          id: `signalement-${type}`,
          type,
          status: "pending",
          source: "trash_spotter",
          observedAt: "2026-04-08",
          locationLabel: "Quai de test",
          latitude: 48.8566,
          longitude: 2.3522,
        }),
      );

      const markup = renderToStaticMarkup(
        React.createElement(ActionPopupContent, {
          item,
          color: "hsl(35, 90%, 50%)",
          coords: { latitude: 48.8566, longitude: 2.3522 },
        }),
      );

      expect(markup).toContain("Voir les preuves photo");
      expect(markup).not.toContain("Chargement des preuves photo");
    },
  );

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
    expect(markup).toContain('href="/reports"');
    expect(markup).toContain("Générer le rapport d&#x27;impact");
    expect(markup).not.toContain("Priorité d'intervention");
    expect(markup).not.toContain("Déclarer une action");
    expect(markup).not.toContain("pollution");
  });

  it("uses an explicit accessible control for long notes on touch and keyboard", () => {
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
        notes: "Note longue de test",
        observedAt: "08/04/2026",
        sourceLabel: "Source: actions",
        updateHref: "/actions/new?lat=48.8566&lng=2.3522",
        hasPollution: true,
        isAction: true,
      }),
    );

    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-controls="action-popup-notes"');
    expect(markup).toContain(">Voir plus</button>");
    expect(markup).not.toContain("group-hover:line-clamp-none");
  });

  it("keeps secondary popup actions compact instead of presenting several full-width CTAs", () => {
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
        notes: null,
        observedAt: "08/04/2026",
        sourceLabel: "Source: actions",
        updateHref: "/actions/new?lat=48.8566&lng=2.3522",
        joinHref: "/sections/rejoindre-un-formulaire?actionId=action-1",
        hasPollution: true,
        isAction: true,
        onViewGeometry: () => undefined,
      }),
    );

    expect(markup).toContain("Nouvelle action ici");
    expect(markup).toContain("Rejoindre un formulaire");
    expect(markup).toContain("Voir tout le parcours");
    expect(markup).toContain("max-w-full px-3");
    expect(markup).not.toContain("h-11 w-full");
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
        geometryKind: "polyline",
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

  it("shows global and department score references together", () => {
    const score = (source: "global" | "department", value: number): ScopedActionPollutionScore => ({
      score: value,
      historicalScore: value,
      wasteScore: value - 4,
      buttsScore: value + 4,
      departmentRelativeScore: source === "department" ? value : null,
      availability: "available",
      source,
    });
    const markup = renderToStaticMarkup(
      React.createElement(ActionPopupContentHeader, {
        recordTypeLabel: "Action terrain",
        locationLabel: "Quai de test",
        actionTitle: "Nettoyage du quai",
        isAction: true,
        color: "#f97316",
        score: 48,
        scoreLoading: false,
        scoreReading: {
          label: "Moyen/Fort",
          guidance: "Passage à planifier",
          tone: "amber",
        },
        scoreSourceLabel: "Référence terrain",
        wasteScore: 44,
        buttsScore: 52,
        statusLabel: "Validée",
        placeType: null,
        quality: null,
        geometryLabel: "Parcours déclaré",
        geometryModeLabel: "Parcours connu",
        geometryKind: "polyline",
        geometryPointLabel: "2 points",
        geometryConfidenceLabel: null,
        geometryMetricLabel: "Longueur ~ 1 km",
        geometryReality: "real",
        observedAt: "08/04/2026",
        wasteKg: 5,
        butts: 42,
        actionProjection: null,
        scoreScope: "department",
        scoreUnavailable: false,
        globalScore: score("global", 48),
        departmentScore: score("department", 62),
        departmentName: "Paris",
      }),
    );

    expect(markup).toContain("Pollution constatée");
    expect(markup).toContain("Déchets 44 %");
    expect(markup).toContain("Mégots 52 %");
    expect(markup).toContain("Score global 48 %");
    expect(markup).toContain("Comparaison départementale");
    expect(markup).toContain("Score relatif 62 %");
    expect(markup).toContain("Référence Paris");
    expect(markup).not.toContain("Projection modélisée");
  });

  it("states when the department reference is unavailable without falling back", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionPopupContentHeader, {
        recordTypeLabel: "Action terrain",
        locationLabel: "Quai de test",
        actionTitle: "Nettoyage du quai",
        isAction: true,
        color: "#94a3b8",
        score: 0,
        scoreLoading: false,
        scoreReading: {
          label: "Non disponible",
          guidance: "Référence insuffisante",
          tone: "sky",
        },
        scoreSourceLabel: "Score départemental indisponible",
        wasteScore: 0,
        buttsScore: 0,
        statusLabel: "Validée",
        placeType: null,
        quality: null,
        geometryLabel: "Point",
        geometryModeLabel: "Point",
        geometryKind: "point",
        geometryPointLabel: "1 point",
        geometryConfidenceLabel: null,
        geometryMetricLabel: null,
        geometryReality: "real",
        observedAt: "08/04/2026",
        wasteKg: 5,
        butts: 42,
        actionProjection: null,
        scoreScope: "department",
        scoreUnavailable: true,
        globalScore: null,
        departmentScore: null,
        departmentName: "Paris",
      }),
    );

    expect(markup).toContain("Comparaison départementale indisponible");
    expect(markup).toContain("Pas assez d&#x27;actions de référence dans ce département.");
    expect(markup).toContain("Référence départementale");
    expect(markup).toContain("Score départemental indisponible");
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
        geometryKind: "polygon",
      }),
    );

    expect(markup).toContain("Voir toute la zone");
  });

  it("routes a clean-place context to the observation entry", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionPopupContentBody, {
        wasteKg: 0,
        butts: 0,
        volunteers: 0,
        durationMinutes: 0,
        operationalEngagementHours: 0,
        associationName: null,
        departure: null,
        arrival: null,
        notes: null,
        observedAt: "08/04/2026",
        sourceLabel: "Source: trash spotter",
        updateHref: "/signalement?lat=48.8566&lng=2.3522",
        hasPollution: false,
        isAction: false,
      }),
    );

    expect(markup).toContain("Mettre à jour l’état du lieu");
    expect(markup).not.toContain('href="/reports"');
    expect(markup).not.toContain("mode=propre");
  });
});

describe("buildActionUpdateHref", () => {
  it("returns the action creation url when coordinates are valid", () => {
    expect(buildActionUpdateHref(true, { latitude: 48.8566, longitude: 2.3522 })).toBe(
      "/actions/new?lat=48.8566&lng=2.3522",
    );
  });

  it("opens the canonical observation form for a clean-place context", () => {
    expect(buildActionUpdateHref(false, { latitude: 48.8566, longitude: 2.3522 })).toBe(
      "/signalement?lat=48.8566&lng=2.3522",
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

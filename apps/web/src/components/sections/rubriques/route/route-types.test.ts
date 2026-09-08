import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { RouteOptionsForm } from "./components/route-constraints-form";
import {
  getRouteGroupPatternLabel,
  getRouteGroupVisualStyle,
  normalizeGroupCountForOrganization,
} from "./route-types";

describe("route organization and representation UI contract", () => {
  it("keeps the whole-group mode at one loop and split mode between two and the volunteer bound", () => {
    expect(normalizeGroupCountForOrganization("whole", 12, 4)).toBe(1);
    expect(normalizeGroupCountForOrganization("split", 12, 1)).toBe(2);
    expect(normalizeGroupCountForOrganization("split", 12, 3)).toBe(3);
    expect(normalizeGroupCountForOrganization("split", 12, 4)).toBe(4);
    expect(normalizeGroupCountForOrganization("split", 12, 20)).toBe(12);
    expect(normalizeGroupCountForOrganization("split", 1, 2)).toBe(1);
  });

  it("assigns deterministic colors and non-color patterns by stable group index", () => {
    const firstColors = [1, 2, 3].map((groupIndex) =>
      getRouteGroupVisualStyle(groupIndex, "colors"),
    );
    const firstPatterns = [1, 2, 3].map((groupIndex) =>
      getRouteGroupVisualStyle(groupIndex, "patterns"),
    );

    expect(firstColors.map(({ color }) => color)).toEqual([
      "#34d399",
      "#60a5fa",
      "#fbbf24",
    ]);
    expect(new Set(firstPatterns.map(({ dashArray }) => dashArray)).size).toBe(3);
    expect(getRouteGroupVisualStyle(1, "colors")).toEqual(
      getRouteGroupVisualStyle(1, "colors"),
    );
    expect(getRouteGroupPatternLabel(2, true)).toBe("tirets");
  });

  it("exposes the explicit organization choices without triggering a request", () => {
    const setOptions = vi.fn();
    const markup = renderToStaticMarkup(
      React.createElement(RouteOptionsForm, {
        options: {
          priorityVsTravel: 65,
          travelBudgetMinutes: 60,
          maxStops: 6,
          volunteers: 12,
          groupCount: 3,
          pickupPreference: "balanced",
        },
        setOptions,
        fr: true,
      }),
    );

    expect(markup).toContain("Organisation du groupe");
    expect(markup).toContain("Garder le groupe entier");
    expect(markup).toContain("Diviser le groupe");
    expect(markup).toContain('min="2"');
    expect(markup).toContain("12 bénévoles → 3 groupes");
    expect(markup).toContain("Que souhaitez-vous principalement ramasser ?");
    expect(markup).toContain("Sans préférence");
    expect(markup).toContain("Déchets");
    expect(markup).toContain("Mégots");
    expect(markup).toContain("Aucun type de pollution n&#x27;est favorisé dans les zones prédites.");
    expect(markup).toContain("Dans les zones prédites, le calcul utilise en priorité le risque déchets.");
    expect(markup).toContain("Dans les zones prédites, le calcul utilise en priorité le risque mégots.");
    expect(setOptions).not.toHaveBeenCalled();
  });
});

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ActionMapItem } from "@/lib/actions/types";
import { resolveActionTitle } from "./action-popup-content.helpers";
import { ActionPopupContentBody } from "./action-popup-content-body";
import { buildActionUpdateHref } from "./action-popup-content.utils";

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

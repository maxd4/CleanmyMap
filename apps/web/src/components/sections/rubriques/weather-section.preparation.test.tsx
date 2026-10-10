import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PreparationLocationBlock, PreparationPanel } from "./weather-section.preparation";
import { buildActionPreparationContext } from "@/lib/actions/action-preparation-context";

describe("PreparationPanel", () => {
  it("uses the action checklist and material contract without global progress checklists", () => {
    const context = buildActionPreparationContext({
      draft: {
        preparationChecklist: [
          { key: "materials_checked", label: "Matériel prévu", checked: true },
          { key: "meeting_point_confirmed", label: "Point confirmé", checked: false },
        ],
        suggestedMaterials: ["gloves"],
        materialsProvided: "Pinces au départ",
        recommendedMaterials: "Eau",
      },
    });

    const html = renderToStaticMarkup(
      React.createElement(PreparationPanel, {
        selectedForecastRisk: null,
        weatherStatus: "empty",
        preparationContext: context,
        fr: true,
      }),
    );

    expect(html).toContain("Checklist unique de préparation");
    expect(html).toContain("Matériel prévu");
    expect(html).toContain("Matériel fourni");
    expect(html).toContain("À prévoir");
    expect(html).toContain("Aucune recommandation météo affichée");
    expect(html).not.toContain("kit-main");
    expect(html).not.toContain("guide-main");
    expect(html).not.toContain("Progression du kit");
    expect(html).not.toContain("x1");
  });

  it("compares weather and action locations by coordinates when labels differ", () => {
    const weather = {
      weatherStatus: "ready" as const,
      locationResolution: "resolved" as const,
      selectedLocation: {
        label: "Nom différent",
        subtitle: "Lieu géocodé",
        latitude: 48.85,
        longitude: 2.35,
        importance: null,
        resolution: "resolved" as const,
      },
      locationQuery: "Nom différent",
      setLocationQuery: () => undefined,
      locationSuggestions: [],
      locationSuggestionsError: null,
      isLocationSuggestionsLoading: false,
      selectLocation: () => undefined,
    };

    const html = renderToStaticMarkup(
      React.createElement(PreparationLocationBlock, {
        actionLocation: "Adresse canonique",
        actionLatitude: "48.85",
        actionLongitude: "2.35",
        actionDate: "2026-10-12",
        weather,
        fr: true,
      }),
    );

    expect(html).not.toContain("Lieu météo différent");
  });
});

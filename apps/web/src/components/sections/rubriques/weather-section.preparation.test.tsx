import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PreparationPanel } from "./weather-section.preparation";
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
        recommendedWindow: null,
        preparationContext: context,
        fr: true,
      }),
    );

    expect(html).toContain("Checklist unique de préparation");
    expect(html).toContain("Matériel prévu");
    expect(html).toContain("Matériel fourni");
    expect(html).toContain("À prévoir");
    expect(html).toContain("météo n’est pas disponible");
    expect(html).not.toContain("kit-main");
    expect(html).not.toContain("guide-main");
    expect(html).not.toContain("Progression du kit");
    expect(html).not.toContain("x1");
  });
});

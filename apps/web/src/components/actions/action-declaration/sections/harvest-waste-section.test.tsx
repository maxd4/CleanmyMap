import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HarvestWasteSection } from "./harvest-waste-section";

function renderWasteSection(overrides: Partial<React.ComponentProps<typeof HarvestWasteSection>> = {}) {
  return renderToStaticMarkup(
    React.createElement(HarvestWasteSection, {
      wasteKg: "8",
      onWasteKgChange: () => undefined,
      wasteMeasurementMethod: "",
      wasteRecyclablesKg: "",
      wasteGlassKg: "",
      wasteHouseholdKg: "",
      wasteOtherKg: "",
      wasteUnusualObjects: "",
      wasteSpecialHandlingWaste: "",
      onMeasurementMethodChange: () => undefined,
      notes: "",
      wasteCategories: [],
      onTriChange: () => undefined,
      wasteCurrentPerVolunteer: 8,
      wasteBenchmarkPerVolunteer: 8,
      wasteDeltaPercent: 0,
      comparisonTone: "slate",
      ...overrides,
    }),
  );
}

describe("HarvestWasteSection comparison", () => {
  it("keeps the waste input and renders the compact visual comparison", () => {
    const markup = renderWasteSection();

    expect(markup).toContain('id="harvest-waste-kg"');
    expect(markup).toContain('data-testid="waste-comparison-visual"');
    expect(markup).toContain("Comparaison visuelle");
    expect(markup.match(/data-testid="waste-comparison-bin"/g)).toHaveLength(3);
  });

  it("hides the comparison without a valid benchmark while preserving the input", () => {
    const markup = renderWasteSection({
      wasteBenchmarkPerVolunteer: null,
      wasteDeltaPercent: null,
    });

    expect(markup).toContain('id="harvest-waste-kg"');
    expect(markup).not.toContain('data-testid="waste-comparison-visual"');
  });
});

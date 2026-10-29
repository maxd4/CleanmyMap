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
      wasteBenchmarkSourceCount: 12,
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
    expect(markup.match(/data-testid="waste-comparison-visual-icon"/g)).toHaveLength(3);
  });

  it("hides the comparison without a valid benchmark while preserving the input", () => {
    const markup = renderWasteSection({
      wasteBenchmarkPerVolunteer: null,
      wasteDeltaPercent: null,
    });

    expect(markup).toContain('id="harvest-waste-kg"');
    expect(markup).not.toContain('data-testid="waste-comparison-visual"');
  });

  it("keeps an explicit zero visible and does not manufacture a value when absent", () => {
    const zeroMarkup = renderWasteSection({
      wasteKg: "0",
      wasteCurrentPerVolunteer: 0,
      wasteBenchmarkPerVolunteer: 8,
      wasteDeltaPercent: -100,
    });
    const absentMarkup = renderWasteSection({
      wasteKg: "",
      wasteCurrentPerVolunteer: null,
      wasteBenchmarkPerVolunteer: 8,
      wasteDeltaPercent: null,
    });

    expect(zeroMarkup).toContain('value="0"');
    expect(zeroMarkup).toContain('data-testid="waste-comparison-visual"');
    expect(absentMarkup).toContain('value=""');
    expect(absentMarkup).not.toContain('data-testid="waste-comparison-visual"');
  });

  it("does not reapply the former 100 kg UI ceiling to a valid declared mass", () => {
    const markup = renderWasteSection({
      wasteKg: "150",
      wasteCurrentPerVolunteer: 150,
      wasteBenchmarkPerVolunteer: 100,
      wasteDeltaPercent: 50,
    });

    expect(markup).toContain('value="150"');
    expect(markup).toContain('max="100000"');
    expect(markup).toContain('data-testid="waste-comparison-visual"');
  });
});

// @vitest-environment jsdom

import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

function InteractiveWasteSection({
  onTriChange,
}: {
  onTriChange: (field: string, value: unknown) => void;
}) {
  const [breakdown, setBreakdown] = React.useState({
    wasteRecyclablesKg: "",
    wasteGlassKg: "",
    wasteHouseholdKg: "",
    wasteOtherKg: "",
  });

  return React.createElement(HarvestWasteSection, {
    wasteKg: "8",
    onWasteKgChange: () => undefined,
    wasteMeasurementMethod: "",
    ...breakdown,
    wasteUnusualObjects: "",
    wasteSpecialHandlingWaste: "",
    onMeasurementMethodChange: () => undefined,
    notes: "",
    wasteCategories: [],
    onTriChange: (field, value) => {
      if (field in breakdown) {
        setBreakdown((current) => ({ ...current, [field]: value as string }));
      }
      onTriChange(field, value);
    },
    wasteCurrentPerVolunteer: 8,
    wasteBenchmarkPerVolunteer: 8,
    wasteBenchmarkSourceCount: 12,
    wasteDeltaPercent: 0,
    comparisonTone: "slate",
  });
}

function activateDisclosureWithKeyboard(button: HTMLButtonElement, key: "Enter" | " ") {
  button.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  button.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
  button.click();
}

describe("HarvestWasteSection comparison", () => {
  it("announces the optional sorting disclosure state and target", () => {
    const markup = renderWasteSection();

    expect(markup).toContain('aria-expanded="false"');
    expect(markup).not.toContain("aria-controls");
    expect(markup).not.toContain('id="harvest-waste-tri-details"');
  });

  describe("sorting disclosure interaction", () => {
    let container: HTMLDivElement;
    let root: ReturnType<typeof createRoot>;

    beforeEach(() => {
      (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
      container = document.createElement("div");
      document.body.appendChild(container);
    });

    afterEach(() => {
      act(() => root.unmount());
      document.body.replaceChildren();
    });

    it("keeps aria-controls synchronized while opening and closing with the keyboard", () => {
      const onTriChange = vi.fn();
      act(() => {
        root = createRoot(container);
        root.render(<InteractiveWasteSection onTriChange={onTriChange} />);
      });

      const button = () => [...container.querySelectorAll("button")]
        .find((candidate) => candidate.textContent?.includes("Détail du tri")) as HTMLButtonElement;
      expect(button().getAttribute("aria-expanded")).toBe("false");
      expect(button().hasAttribute("aria-controls")).toBe(false);
      expect(container.querySelector("#harvest-waste-tri-details")).toBeNull();

      act(() => activateDisclosureWithKeyboard(button(), "Enter"));
      expect(button().getAttribute("aria-expanded")).toBe("true");
      expect(button().getAttribute("aria-controls")).toBe("harvest-waste-tri-details");
      expect(container.querySelector("#harvest-waste-tri-details")).not.toBeNull();

      const recyclableInput = container.querySelector("#harvest-waste-recyclables-kg") as HTMLInputElement;
      const valueSetter = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(recyclableInput),
        "value",
      )?.set;
      act(() => {
        valueSetter?.call(recyclableInput, "4.5");
        recyclableInput.dispatchEvent(new Event("input", { bubbles: true }));
        recyclableInput.dispatchEvent(new Event("change", { bubbles: true }));
      });
      expect(onTriChange).toHaveBeenCalledWith("wasteRecyclablesKg", "4.5");

      act(() => activateDisclosureWithKeyboard(button(), " "));
      expect(button().getAttribute("aria-expanded")).toBe("false");
      expect(button().hasAttribute("aria-controls")).toBe(false);
      expect(container.querySelector("#harvest-waste-tri-details")).toBeNull();
    });
  });

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

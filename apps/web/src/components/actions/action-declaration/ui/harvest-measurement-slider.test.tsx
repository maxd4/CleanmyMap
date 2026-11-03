// @vitest-environment jsdom

import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HarvestMeasurementSlider } from "./harvest-measurement-slider";

describe("HarvestMeasurementSlider", () => {
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

  function renderSlider(overrides: Partial<React.ComponentProps<typeof HarvestMeasurementSlider>> = {}) {
    const onChange = overrides.onChange ?? vi.fn();
    act(() => {
      root = createRoot(container);
      root.render(
        <HarvestMeasurementSlider
          id="measurement-slider"
          label="Masse collectée"
          value=""
          initialMax={20}
          extension={20}
          absoluteMax={100}
          step={0.1}
          unit="kg"
          accent="emerald"
          formatValue={(value) => value.toFixed(1).replace(".", ",")}
          onChange={onChange}
          {...overrides}
        />,
      );
    });
    return { slider: container.querySelector("#measurement-slider") as HTMLInputElement, onChange };
  }

  it("keeps absence distinct from an explicit zero", () => {
    const { slider } = renderSlider();

    expect(slider.value).toBe("0");
    expect(slider.getAttribute("aria-valuetext")).toBe("Non renseigné");
    expect(container.querySelector("output")?.textContent).toBe("Non renseigné");

    act(() => {
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(slider.getAttribute("aria-valuetext")).toBe("Non renseigné");
  });

  it("keeps a 0.1 kg step and extends when the selected value reaches the bound", () => {
    const { slider, onChange } = renderSlider({ value: "0" });

    expect(slider.getAttribute("step")).toBe("0.1");
    expect(slider.getAttribute("max")).toBe("20");
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(slider), "value")?.set?.call(slider, "20");
    act(() => slider.dispatchEvent(new Event("change", { bubbles: true })));

    expect(onChange).toHaveBeenCalledWith("20.0");
    expect(slider.getAttribute("max")).toBe("40");
  });

  it("preserves a historical value above the initial range", () => {
    const { slider } = renderSlider({ value: "41" });

    expect(slider.value).toBe("41");
    expect(slider.getAttribute("max")).toBe("60");
  });

  it("routes exact input changes to the same canonical callback", () => {
    const { onChange } = renderSlider({
      value: "1000",
      id: "butts-slider",
      label: "Nombre de mégots",
      unit: "mégots",
      initialMax: 5_000,
      extension: 5_000,
      absoluteMax: 5_000_000,
      step: 1,
      accent: "blue",
      exactInputId: "butts-exact",
      exactInputLabel: "Saisie exacte (mégots)",
      formatValue: (value) => new Intl.NumberFormat("fr-FR").format(value),
    });
    const exact = container.querySelector("#butts-exact") as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(exact), "value")?.set;
    act(() => {
      setter?.call(exact, "2501");
      exact.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith("2501");
  });

  it("supports exact absence, zero, positive and cleared mass transitions", () => {
    const exactProps = {
      exactInputId: "waste-exact",
      exactInputLabel: "Saisie exacte (kg)",
      exactInputMode: "decimal",
    } as const;

    const positiveTransition = renderSlider({ value: "", ...exactProps });
    const positiveInput = container.querySelector("#waste-exact") as HTMLInputElement;
    const positiveSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(positiveInput), "value")?.set;
    act(() => {
      positiveSetter?.call(positiveInput, "12.3");
      positiveInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(positiveTransition.onChange).toHaveBeenCalledWith("12.3");

    act(() => root.unmount());
    const zeroTransition = renderSlider({ value: "", ...exactProps });
    const zeroInput = container.querySelector("#waste-exact") as HTMLInputElement;
    const zeroSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(zeroInput), "value")?.set;
    act(() => {
      zeroSetter?.call(zeroInput, "0");
      zeroInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(zeroTransition.onChange).toHaveBeenCalledWith("0");

    act(() => root.unmount());
    const clearTransition = renderSlider({ value: "12.3", ...exactProps });
    const clearInput = container.querySelector("#waste-exact") as HTMLInputElement;
    const clearSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(clearInput), "value")?.set;
    act(() => {
      clearSetter?.call(clearInput, "");
      clearInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(clearTransition.onChange).toHaveBeenCalledWith("");
  });

  it("keeps an elevated historical value available in the exact input", () => {
    renderSlider({
      value: "12345.6",
      absoluteMax: 20_000,
      exactInputId: "waste-exact",
      exactInputLabel: "Saisie exacte (kg)",
      exactInputMode: "decimal",
    });

    const exact = container.querySelector("#waste-exact") as HTMLInputElement;
    const slider = container.querySelector("#measurement-slider") as HTMLInputElement;

    expect(exact.value).toBe("12345.6");
    expect(slider.value).toBe("12345.6");
    expect(slider.getAttribute("max")).toBe("12360");
  });

  it("renders a multi-lot total as a non-editable range", () => {
    const { slider, onChange } = renderSlider({
      value: "7000",
      readOnly: true,
      readOnlyLabel: "Total des lots : modifiez les valeurs dans chaque lot.",
    });

    expect(slider.disabled).toBe(true);
    expect(slider.getAttribute("aria-readonly")).toBe("true");
    expect(container.textContent).toContain("Total des lots");
    expect(onChange).not.toHaveBeenCalled();
  });
});

// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { AiFootprintMethodologySection } from "./ai-footprint-methodology-section";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("AiFootprintMethodologySection interactions", () => {
  let host: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
  });

  function render(): void {
    host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      root = createRoot(host);
      root.render(<AiFootprintMethodologySection isFrench />);
    });
  }

  function changeValue(element: HTMLInputElement | HTMLSelectElement, value: string): void {
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value");
    act(() => {
      descriptor?.set?.call(element, value);
      element.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  it("recalculates from selected region, explicit recycling assumptions, and the chosen butt path", () => {
    render();
    const status = () => host.querySelector('[role="status"]')?.textContent ?? "";
    const region = host.querySelectorAll("select")[1] as HTMLSelectElement;
    const waterMode = host.querySelectorAll("select")[2] as HTMLSelectElement;
    const checks = host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    const slider = host.querySelector<HTMLInputElement>('input[type="range"]')!;

    expect(status()).toContain("UNKNOWN");
    changeValue(region, "US_PROXY");
    changeValue(waterMode, "RISQUE_CONVENTIONNEL");
    act(() => { checks[0].click(); });
    expect(status()).toContain("FEASIBLE_SCENARIO");

    changeValue(slider, "100");
    expect(status()).toContain("INFEASIBLE");
    act(() => { checks[1].click(); });
    expect(status()).toContain("FEASIBLE_SCENARIO");
  });
});

import React, { useState } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it } from "vitest";
import { createInitialFormState } from "../payload";
import type { FormState } from "../model";
import { useHarvestLogic, type UseHarvestLogicResult } from "./use-harvest-logic";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type HarnessSnapshot = {
  form: FormState;
  logic: UseHarvestLogicResult;
};

function Harness({
  initialForm,
  onSnapshot,
}: {
  initialForm: FormState;
  onSnapshot: (snapshot: HarnessSnapshot) => void;
}) {
  const [form, setForm] = useState(initialForm);
  const logic = useHarvestLogic({
    form,
    updateFields: (updates) => setForm((current) => ({ ...current, ...updates })),
  });

  onSnapshot({ form, logic });
  return null;
}

function mountLogic(initialForm: FormState) {
  let latest!: HarnessSnapshot;
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      React.createElement(Harness, {
        initialForm,
        onSnapshot: (snapshot) => {
          latest = snapshot;
        },
      }),
    );
  });

  return { renderer, get latest() { return latest; } };
}

describe("useHarvestLogic cigarette-butt synchronization", () => {
  it("derives mass from the count and keeps the conversion provenance", () => {
    const harness = mountLogic({
      ...createInitialFormState("Test"),
      wasteMegotsCondition: "humide",
    });

    act(() => {
      harness.latest.logic.syncMegotsWeightFromCount("1750");
    });

    expect(harness.latest.form.cigaretteButtsCount).toBe("1750");
    expect(harness.latest.form.wasteMegotsKg).toBe("1");
    expect(harness.latest.form.cigaretteButtsInputSource).toBe("count");
    expect(harness.latest.logic.megotsCount).toBe(1750);
    expect(harness.latest.logic.megotsKg).toBe(1);
    expect(harness.latest.logic.cigaretteButtsCountProvenance).toBe("counted");
    expect(harness.latest.logic.cigaretteButtsMassProvenance).toBe("weight_converted");
    expect(harness.latest.logic.cigaretteButtsConversionFormulaVersion).toBe("impact-terrain-2026-butts-mass-v1");

    harness.renderer.unmount();
  });

  it("derives count from the mass and lets the condition recalculate the other field", () => {
    const harness = mountLogic({
      ...createInitialFormState("Test"),
      wasteMegotsCondition: "propre",
    });

    act(() => {
      harness.latest.logic.syncMegotsWeightFromWeight("1");
    });

    expect(harness.latest.form.wasteMegotsKg).toBe("1");
    expect(harness.latest.form.cigaretteButtsInputSource).toBe("mass");
    expect(harness.latest.form.cigaretteButtsCount).toBe("2500");
    expect(harness.latest.logic.cigaretteButtsCountProvenance).toBe("weight_converted");
    expect(harness.latest.logic.cigaretteButtsMassProvenance).toBe("measured");

    act(() => {
      harness.latest.logic.syncMegotsCondition("mouille");
    });

    expect(harness.latest.form.wasteMegotsCondition).toBe("mouille");
    expect(harness.latest.form.cigaretteButtsCondition).toBe("mouille");
    expect(harness.latest.form.cigaretteButtsCount).toBe("1000");
    expect(harness.latest.form.wasteMegotsKg).toBe("1");

    harness.renderer.unmount();
  });

  it("preserves an explicit zero and clears both measurements when the source is erased", () => {
    const harness = mountLogic({
      ...createInitialFormState("Test"),
      wasteMegotsCondition: "propre",
    });

    act(() => {
      harness.latest.logic.syncMegotsWeightFromCount("0");
    });

    expect(harness.latest.form.cigaretteButtsCount).toBe("0");
    expect(harness.latest.form.wasteMegotsKg).toBe("0");
    expect(harness.latest.logic.megotsCount).toBe(0);
    expect(harness.latest.logic.megotsKg).toBe(0);

    act(() => {
      harness.latest.logic.syncMegotsWeightFromCount("");
    });

    expect(harness.latest.form.cigaretteButtsCount).toBe("");
    expect(harness.latest.form.wasteMegotsKg).toBe("");
    expect(harness.latest.logic.megotsCount).toBeNull();
    expect(harness.latest.logic.megotsKg).toBeNull();
    expect(harness.latest.logic.cigaretteButtsConversionFormulaVersion).toBeNull();

    harness.renderer.unmount();
  });

  it("reuses a hydrated mass source when the condition changes", () => {
    const harness = mountLogic({
      ...createInitialFormState("Test"),
      wasteMegotsKg: "1",
      cigaretteButtsCount: "1750",
      wasteMegotsCondition: "humide",
      cigaretteButtsCondition: "humide",
      cigaretteButtsInputSource: "mass",
    });

    act(() => {
      harness.latest.logic.syncMegotsCondition("propre");
    });

    expect(harness.latest.form.wasteMegotsKg).toBe("1");
    expect(harness.latest.form.cigaretteButtsCount).toBe("2500");
    expect(harness.latest.form.cigaretteButtsInputSource).toBe("mass");
    expect(harness.latest.form.cigaretteButtsCondition).toBe("propre");

    harness.renderer.unmount();
  });

  it("does not rewrite an indeterminate historical pair on condition change", () => {
    const harness = mountLogic({
      ...createInitialFormState("Test"),
      wasteMegotsKg: "1",
      cigaretteButtsCount: "1700",
      wasteMegotsCondition: "humide",
      cigaretteButtsCondition: "humide",
      cigaretteButtsInputSource: "unknown",
    });

    act(() => {
      harness.latest.logic.syncMegotsCondition("propre");
    });

    expect(harness.latest.form.wasteMegotsKg).toBe("1");
    expect(harness.latest.form.cigaretteButtsCount).toBe("1700");
    expect(harness.latest.form.cigaretteButtsInputSource).toBe("unknown");

    harness.renderer.unmount();
  });
});

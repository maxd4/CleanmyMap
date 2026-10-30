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
      cigaretteButtsCountProvenance: "weight_converted",
      cigaretteButtsMassProvenance: "measured",
      cigaretteButtsVolumeProvenance: "unknown",
      cigaretteButtsConversionFormulaVersion: "impact-terrain-2026-butts-mass-v1",
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
      cigaretteButtsCountProvenance: "unknown",
      cigaretteButtsMassProvenance: "unknown",
      cigaretteButtsVolumeProvenance: "unknown",
      cigaretteButtsConversionFormulaVersion: null,
    });

    act(() => {
      harness.latest.logic.syncMegotsCondition("propre");
    });

    expect(harness.latest.form.wasteMegotsKg).toBe("1");
    expect(harness.latest.form.cigaretteButtsCount).toBe("1700");
    expect(harness.latest.form.cigaretteButtsInputSource).toBe("unknown");

    harness.renderer.unmount();
  });

  it("preserves the other value and historical provenance when an ambiguous count is cleared", () => {
    const harness = mountLogic({
      ...createInitialFormState("Test"),
      wasteMegotsKg: "1",
      cigaretteButtsCount: "1700",
      wasteMegotsCondition: "humide",
      cigaretteButtsCondition: "humide",
      cigaretteButtsInputSource: "unknown",
      cigaretteButtsCountProvenance: "unknown",
      cigaretteButtsMassProvenance: "unknown",
    });

    act(() => {
      harness.latest.logic.syncMegotsWeightFromCount("");
    });

    expect(harness.latest.form.cigaretteButtsCount).toBe("");
    expect(harness.latest.form.wasteMegotsKg).toBe("1");
    expect(harness.latest.logic.megotsCount).toBeNull();
    expect(harness.latest.logic.megotsKg).toBe(1);
    expect(harness.latest.logic.cigaretteButtsMassProvenance).toBe("unknown");

    harness.renderer.unmount();
  });

  it("preserves the other value and historical provenance when an ambiguous mass is cleared", () => {
    const harness = mountLogic({
      ...createInitialFormState("Test"),
      wasteMegotsKg: "1",
      cigaretteButtsCount: "1700",
      wasteMegotsCondition: "humide",
      cigaretteButtsCondition: "humide",
      cigaretteButtsInputSource: "unknown",
      cigaretteButtsCountProvenance: "unknown",
      cigaretteButtsMassProvenance: "unknown",
    });

    act(() => {
      harness.latest.logic.syncMegotsWeightFromWeight("");
    });

    expect(harness.latest.form.cigaretteButtsCount).toBe("1700");
    expect(harness.latest.form.wasteMegotsKg).toBe("");
    expect(harness.latest.logic.megotsCount).toBe(1700);
    expect(harness.latest.logic.megotsKg).toBeNull();
    expect(harness.latest.logic.cigaretteButtsCountProvenance).toBe("unknown");

    harness.renderer.unmount();
  });

  it("preserves an independent measured mass when the counted value is cleared", () => {
    const harness = mountLogic({
      ...createInitialFormState("Test"),
      wasteMegotsKg: "1",
      cigaretteButtsCount: "1700",
      wasteMegotsCondition: "humide",
      cigaretteButtsCondition: "humide",
      cigaretteButtsInputSource: "unknown",
      cigaretteButtsCountProvenance: "counted",
      cigaretteButtsMassProvenance: "measured",
    });

    act(() => {
      harness.latest.logic.syncMegotsWeightFromCount("");
    });

    expect(harness.latest.form.wasteMegotsKg).toBe("1");
    expect(harness.latest.logic.cigaretteButtsMassProvenance).toBe("measured");

    harness.renderer.unmount();
  });

  it("keeps a measured source when only its derived counterpart is cleared", () => {
    const harness = mountLogic({
      ...createInitialFormState("Test"),
      wasteMegotsKg: "1",
      cigaretteButtsCount: "1750",
      wasteMegotsCondition: "humide",
      cigaretteButtsCondition: "humide",
      cigaretteButtsInputSource: "mass",
      cigaretteButtsCountProvenance: "weight_converted",
      cigaretteButtsMassProvenance: "measured",
      cigaretteButtsConversionFormulaVersion: "impact-terrain-2026-butts-mass-v1",
    });

    act(() => {
      harness.latest.logic.syncMegotsWeightFromCount("");
    });

    expect(harness.latest.form.wasteMegotsKg).toBe("1");
    expect(harness.latest.form.cigaretteButtsCount).toBe("");
    expect(harness.latest.logic.megotsKg).toBe(1);
    expect(harness.latest.logic.megotsCount).toBeNull();
    expect(harness.latest.logic.cigaretteButtsMassProvenance).toBe("measured");

    harness.renderer.unmount();
  });

  it("tracks an explicit zero and an independently entered volume without conversion", () => {
    const harness = mountLogic({
      ...createInitialFormState("Test"),
      wasteMegotsCondition: "propre",
    });

    act(() => {
      harness.latest.logic.syncMegotsWeightFromCount("0");
      harness.latest.logic.syncMegotsVolume("0");
    });

    expect(harness.latest.form.cigaretteButtsCount).toBe("0");
    expect(harness.latest.form.wasteMegotsKg).toBe("0");
    expect(harness.latest.form.cigaretteButtsVolumeLiters).toBe("0");
    expect(harness.latest.logic.megotsCount).toBe(0);
    expect(harness.latest.logic.megotsKg).toBe(0);
    expect(harness.latest.logic.cigaretteButtsVolumeProvenance).toBe("measured");

    act(() => {
      harness.latest.logic.syncMegotsVolume("");
    });

    expect(harness.latest.form.cigaretteButtsVolumeLiters).toBe("");
    expect(harness.latest.logic.cigaretteButtsVolumeProvenance).toBe("unknown");
    expect(harness.latest.logic.megotsCount).toBe(0);

    harness.renderer.unmount();
  });

  it("keeps hydrated volume provenance while editing another butt field", () => {
    const harness = mountLogic({
      ...createInitialFormState("Test"),
      cigaretteButtsCount: "1700",
      wasteMegotsKg: "1",
      cigaretteButtsVolumeLiters: "2.5",
      wasteMegotsCondition: "humide",
      cigaretteButtsCondition: "humide",
      cigaretteButtsInputSource: "unknown",
      cigaretteButtsCountProvenance: "unknown",
      cigaretteButtsMassProvenance: "unknown",
      cigaretteButtsVolumeProvenance: "volume_converted",
      cigaretteButtsConversionFormulaVersion: null,
    });

    act(() => {
      harness.latest.logic.syncMegotsWeightFromCount("1800");
    });

    expect(harness.latest.form.cigaretteButtsVolumeLiters).toBe("2.5");
    expect(harness.latest.form.cigaretteButtsVolumeProvenance).toBe("volume_converted");
    expect(harness.latest.logic.cigaretteButtsVolumeProvenance).toBe("volume_converted");

    act(() => {
      harness.latest.logic.syncMegotsVolume("2.5");
    });

    expect(harness.latest.form.cigaretteButtsVolumeProvenance).toBe("volume_converted");

    harness.renderer.unmount();
  });
});

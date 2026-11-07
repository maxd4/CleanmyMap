import { useState } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { FormState } from "./model";
import { createInitialFormState } from "./payload";
import { ActionDurationSlider, ScheduleFields } from "./before/planned-action-schedule-fields";
import { ActionTimeSection } from "./steps/action-step-identity.time";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function ControlledDurationSection({ beforeForm, initialDurationMinutes = "" }: { beforeForm: boolean; initialDurationMinutes?: string }) {
  const [form, setForm] = useState(() => ({
    ...createInitialFormState("Test", "action"),
    durationMinutes: initialDurationMinutes,
  }));
  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return beforeForm ? (
    <ScheduleFields
      form={form}
      updateField={updateField}
      hasAttemptedSubmit={false}
      validationIssueFields={[]}
    />
  ) : (
    <ActionTimeSection form={form} updateField={updateField} variant="duration" />
  );
}

function findButton(renderer: ReactTestRenderer, label: string) {
  const button = renderer.root.findAll(
    (node) => node.type === "button" && node.children.join("") === label,
  )[0];
  expect(button, `button ${label}`).toBeDefined();
  return button;
}

function findControl(renderer: ReactTestRenderer, id: string) {
  return renderer.root.find(
    (node) => (node.type === "input" || node.type === "select") && node.props.id === id,
  );
}

function exerciseBlankZeroBlank(beforeForm: boolean) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<ControlledDurationSection beforeForm={beforeForm} />);
  });

  const durationId = beforeForm ? "before-duration-minutes" : "action-duration-minutes";
  expect(findControl(renderer, `${durationId}-hours`).props.value).toBe("");
  expect(findControl(renderer, `${durationId}-minutes`).props.value).toBe("0");
  findButton(renderer, "Déclarer 0 min");
  act(() => {
    findButton(renderer, "Déclarer 0 min").props.onClick();
  });
  expect(findControl(renderer, `${durationId}-hours`).props.value).toBe("0");
  expect(findControl(renderer, `${durationId}-minutes`).props.value).toBe("0");
  findButton(renderer, "Ne pas renseigner cette durée");

  act(() => {
    findButton(renderer, "Ne pas renseigner cette durée").props.onClick();
  });
  expect(findControl(renderer, `${durationId}-hours`).props.value).toBe("");
  findButton(renderer, "Déclarer 0 min");
  renderer.unmount();
}

describe("action duration declaration behavior", () => {
  it("replaces the repeated hint with accessible editable hours and minutes", () => {
    const markup = renderToStaticMarkup(
      <ActionDurationSlider id="action-duration-minutes" value="135" onChange={() => undefined} />,
    );

    expect(markup).toContain('aria-label="Heures"');
    expect(markup).toContain('aria-label="Minutes"');
    expect(markup).toContain("2 h 15 min");
    expect(markup).not.toContain("pas de 15 min");
  });

  it.each([
    [false, "complete"],
    [true, "pre-action"],
  ])("supports blank → explicit zero → blank in the %s form", (beforeForm) => {
    exerciseBlankZeroBlank(beforeForm);
  });

  it("synchronizes slider changes to editable hours and quarter-hour minutes", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<ControlledDurationSection beforeForm={false} />);
    });

    act(() => {
      findControl(renderer, "action-duration-minutes").props.onChange({ target: { value: "135" } });
    });

    expect(findControl(renderer, "action-duration-minutes-hours").props.value).toBe("2");
    expect(findControl(renderer, "action-duration-minutes-minutes").props.value).toBe("15");
    expect(findControl(renderer, "action-duration-minutes").props["aria-valuetext"]).toBe("2 h 15 min");
    renderer.unmount();
  });

  it("synchronizes keyboard-edited hours and minutes back to the slider", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<ControlledDurationSection beforeForm={false} initialDurationMinutes="60" />);
    });

    act(() => {
      findControl(renderer, "action-duration-minutes-hours").props.onChange({ target: { value: "2" } });
    });
    expect(findControl(renderer, "action-duration-minutes").props.value).toBe(120);

    act(() => {
      findControl(renderer, "action-duration-minutes-minutes").props.onChange({ target: { value: "45" } });
    });
    expect(findControl(renderer, "action-duration-minutes").props.value).toBe(165);
    renderer.unmount();
  });

  it("keeps 24 h 00 min valid and exposes only quarter-hour minute choices", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<ControlledDurationSection beforeForm={false} initialDurationMinutes="1440" />);
    });

    expect(findControl(renderer, "action-duration-minutes-hours").props.value).toBe("24");
    expect(findControl(renderer, "action-duration-minutes-minutes").props.value).toBe("0");
    expect(findControl(renderer, "action-duration-minutes").props.value).toBe(1440);
    expect(renderer.root.findAllByType("option").map((option) => option.props.value)).toEqual([0, 15, 30, 45]);
    expect(renderer.root.findAllByType("option").slice(1).every((option) => option.props.disabled)).toBe(true);
    renderer.unmount();
  });

  it("rejects negative, fractional, out-of-range and non-quarter-hour edits", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<ControlledDurationSection beforeForm={false} initialDurationMinutes="60" />);
    });

    for (const value of ["-1", "1.5", "25"]) {
      act(() => {
        findControl(renderer, "action-duration-minutes-hours").props.onChange({ target: { value } });
      });
      expect(findControl(renderer, "action-duration-minutes").props.value).toBe(60);
    }
    act(() => {
      findControl(renderer, "action-duration-minutes-minutes").props.onChange({ target: { value: "10" } });
    });
    expect(findControl(renderer, "action-duration-minutes").props.value).toBe(60);
    renderer.unmount();
  });

  it("does not calculate organization time from an absent action duration", () => {
    const form = createInitialFormState("Test", "action");
    form.eventStartTime = "09:00";
    form.eventEndTime = "10:00";

    const absentMarkup = renderToStaticMarkup(
      <ActionTimeSection form={form} updateField={() => undefined} variant="full" />,
    );
    expect(absentMarkup).not.toContain("Organisation : 60 min");

    form.durationMinutes = "0";
    const explicitZeroMarkup = renderToStaticMarkup(
      <ActionTimeSection form={form} updateField={() => undefined} variant="full" />,
    );
    expect(explicitZeroMarkup).toContain("Organisation : 60 min");
  });
});

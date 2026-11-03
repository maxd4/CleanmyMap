import { useState } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { FormState } from "./model";
import { createInitialFormState } from "./payload";
import { ScheduleFields } from "./before/planned-action-schedule-fields";
import { ActionTimeSection } from "./steps/action-step-identity.time";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function ControlledDurationSection({ beforeForm }: { beforeForm: boolean }) {
  const [form, setForm] = useState(() => createInitialFormState("Test", "action"));
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

function exerciseBlankZeroBlank(beforeForm: boolean) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<ControlledDurationSection beforeForm={beforeForm} />);
  });

  findButton(renderer, "Déclarer 0 min");
  act(() => {
    findButton(renderer, "Déclarer 0 min").props.onClick();
  });
  findButton(renderer, "Ne pas renseigner cette durée");

  act(() => {
    findButton(renderer, "Ne pas renseigner cette durée").props.onClick();
  });
  findButton(renderer, "Déclarer 0 min");
  renderer.unmount();
}

describe("action duration declaration behavior", () => {
  it.each([
    [false, "complete"],
    [true, "pre-action"],
  ])("supports blank → explicit zero → blank in the %s form", (beforeForm) => {
    exerciseBlankZeroBlank(beforeForm);
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

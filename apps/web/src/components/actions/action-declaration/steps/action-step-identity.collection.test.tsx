import { useState } from "react";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it } from "vitest";
import type { FormState } from "../model";
import { createInitialFormState } from "../payload";
import { ActionCollectionSection } from "./action-step-identity.collection";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function ControlledCollection() {
  const [form, setForm] = useState(() => createInitialFormState("Test", "action"));
  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return <ActionCollectionSection form={form} updateField={updateField} variant="full" />;
}

function findEnvironmentButton(renderer: ReactTestRenderer, label: string): ReactTestInstance {
  const button = renderer.root.findAllByType("button").find((candidate) =>
    candidate.findAll(
      (node) => node.type === "span" && node.children.join("") === label,
    ).length > 0,
  );
  expect(button, `button ${label}`).toBeDefined();
  return button!;
}

describe("ActionCollectionSection", () => {
  it("keeps the canonical environments compact and free of long descriptions", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<ControlledCollection />);
    });

    const buttons = renderer.root.findAllByType("button");
    expect(buttons).toHaveLength(10);
    expect(buttons.filter((button) => button.props["aria-pressed"] === true)).toHaveLength(1);
    for (const label of [
      "Rues & espaces urbains",
      "Parcs & jardins",
      "Forêts & campagne",
      "Rivières & plans d'eau",
      "Littoral & plages",
      "Gares & espaces couverts",
      "Parkings & zones d'activités",
      "Abords routiers",
      "Autre",
    ]) {
      findEnvironmentButton(renderer, label);
    }
    expect(buttons.every((button) => button.props.title === undefined)).toBe(true);
    expect(buttons[9]?.children.join("")).toContain("Type d’environnement non renseigné");
    expect(renderer.root.findAll((node) => node.type === "p" && node.children.join("").includes("Bois, forêts"))).toHaveLength(0);
    renderer.unmount();
  });

  it("keeps one selected environment and exposes the roadside safety warning", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<ControlledCollection />);
    });

    act(() => {
      findEnvironmentButton(renderer, "Abords routiers").props.onClick();
    });
    const roadsideButton = findEnvironmentButton(renderer, "Abords routiers");
    expect(roadsideButton.props["aria-pressed"]).toBe(true);
    expect(roadsideButton.props.className).toContain("bg-emerald-900");
    expect(roadsideButton.props.className).toContain("text-white");
    expect(renderer.root.findAll((node) => node.type === "button" && node.props["aria-pressed"] === true)).toHaveLength(1);
    expect(renderer.root.findAll((node) => node.type === "p" && node.props.role === "alert")).toHaveLength(1);

    act(() => {
      findEnvironmentButton(renderer, "Autre").props.onClick();
    });
    expect(findEnvironmentButton(renderer, "Autre").props["aria-pressed"]).toBe(true);
    expect(renderer.root.findAll((node) => node.type === "p" && node.props.role === "alert")).toHaveLength(0);
    renderer.unmount();
  });
});

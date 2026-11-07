import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createInitialFormState } from "./payload";
import { ActionLocationInputs } from "./action-location-inputs";
import type { ActionLocationInputProps } from "./action-location.types";
import { hasUsableServerRouteInput } from "./hooks/action-declaration-form-geometry";

function renderInputs(
  mode: NonNullable<ActionLocationInputProps["mode"]>,
  configure?: (form: ReturnType<typeof createInitialFormState>) => void,
) {
  const form = createInitialFormState("Alice");
  configure?.(form);
  return renderToStaticMarkup(
    <ActionLocationInputs
      form={form}
      updateField={() => undefined}
      updateFields={() => undefined}
      recordType="action"
      gpsStatus="idle"
      gpsMessage={null}
      onAutofillGps={() => undefined}
      mode={mode}
    />,
  );
}

describe("action location input modes", () => {
  it.each([
    ["empty strings", "", "", false],
    ["spaces", "  ", "  ", false],
    ["latitude only", "48.85", "", false],
    ["longitude only", "", "2.35", false],
    ["NaN", "NaN", "2.35", false],
    ["out of bounds latitude", "91", "2.35", false],
    ["out of bounds longitude", "48.85", "181", false],
    ["complete pair", "48.85", "2.35", true],
  ] as const)("recognizes %s only when the coordinate pair is usable", (_label, latitude, longitude, expected) => {
    expect(hasUsableServerRouteInput({ routePreviewInput: "", latitude, longitude })).toBe(expected);
  });

  it("keeps a text location usable without pretending it has coordinates", () => {
    expect(hasUsableServerRouteInput({ routePreviewInput: "Quai de test", latitude: "", longitude: "" })).toBe(true);
  });

  it("renders the compact topology and loop address in primary mode", () => {
    const markup = renderInputs("primary");

    expect(markup).toContain('id="departure"');
    expect(markup).toContain('id="route-topology-loop"');
    expect(markup).toContain("DÉPART ET ARRIVÉE · Ex. Rue de Rivoli, Paris");
    expect(markup).not.toContain('id="arrival"');
    expect(markup).not.toContain('id="midpoint"');
    expect(markup).not.toContain("Distance cible du parcours");
  });

  it("renders the arrival field only for a point-to-point primary route", () => {
    const markup = renderInputs("primary", (form) => {
      form.routeTopology = "point_to_point";
    });

    expect(markup).toContain('id="route-topology-point_to_point"');
    expect(markup).toContain('id="departure"');
    expect(markup).toContain('id="arrival"');
    expect(markup).toContain("DÉPART · Ex. Rue de Rivoli, Paris");
    expect(markup).toContain("ARRIVÉE · Ex. Place de la République, Paris");
  });

  it("keeps details mode focused on the secondary location controls", () => {
    const markup = renderInputs("details");

    expect(markup).not.toContain('id="departure"');
    expect(markup).toContain('id="midpoint"');
    expect(markup).not.toContain("Type de parcours");
    expect(markup).not.toContain('id="arrival"');
    expect(markup).toContain('id="route-target-distance"');
    expect(markup).toContain("p-3");
  });

  it("renders the complete location controls in all mode", () => {
    const markup = renderInputs("all");

    expect(markup).toContain('id="departure"');
    expect(markup).toContain('id="midpoint"');
    expect(markup).toContain("Type de parcours");
    expect(markup).toContain("Distance cible du parcours");
    expect(markup).toContain("pas distance parcourue");
    expect(markup).toContain("position actuelle de mon appareil");
    expect(markup).toContain("Proposition automatique");
    expect(markup).toContain("Parcours du générateur");
    expect(markup).toContain("Dessin manuel");
    expect(markup).toContain("Import GPX");
    expect(markup).toContain("Localisation seule");
  });
});

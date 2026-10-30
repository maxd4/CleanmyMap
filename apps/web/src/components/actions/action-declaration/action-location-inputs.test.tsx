import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createInitialFormState } from "./payload";
import { ActionLocationInputs } from "./action-location-inputs";
import type { ActionLocationInputProps } from "./action-location.types";
import { hasUsableServerRouteInput } from "./hooks/action-declaration-form-geometry";

function renderInputs(mode: NonNullable<ActionLocationInputProps["mode"]>) {
  const form = createInitialFormState("Alice");
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

  it("keeps the primary mode limited to the departure field", () => {
    const markup = renderInputs("primary");

    expect(markup).toContain('id="departure"');
    expect(markup).not.toContain('id="midpoint"');
    expect(markup).not.toContain("Distance cible du parcours");
  });

  it("keeps details mode focused on the secondary location controls", () => {
    const markup = renderInputs("details");

    expect(markup).not.toContain('id="departure"');
    expect(markup).toContain('id="midpoint"');
    expect(markup).toContain("Type de parcours");
    expect(markup).toContain('id="route-target-distance"');
  });

  it("renders the complete location controls in all mode", () => {
    const markup = renderInputs("all");

    expect(markup).toContain('id="departure"');
    expect(markup).toContain('id="midpoint"');
    expect(markup).toContain("Type de parcours");
    expect(markup).toContain("Distance cible du parcours");
    expect(markup).toContain("ne mesure pas une distance parcourue");
    expect(markup).toContain("position actuelle de l&#x27;appareil");
    expect(markup).toContain("Proposition automatique");
    expect(markup).toContain("Parcours du générateur");
    expect(markup).toContain("Dessin manuel");
    expect(markup).toContain("Import GPX");
    expect(markup).toContain("Localisation seule");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createInitialFormState } from "./payload";
import { ActionLocationInputs } from "./action-location-inputs";
import type { ActionLocationInputProps } from "./action-location.types";

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
  });
});

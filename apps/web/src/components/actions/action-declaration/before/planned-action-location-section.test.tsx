import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createInitialFormState } from "../payload";

vi.mock("../action-address-autocomplete", () => ({
  ActionAddressAutocomplete: ({ id, countryCode }: { id: string; countryCode?: string }) => (
    <div data-testid={id} data-country-code={countryCode ?? "FR"} />
  ),
}));

import { PlannedActionLocationSection } from "./planned-action-location-section";

describe("PlannedActionLocationSection country context", () => {
  it.each(["BE", "CH", "CA", "SN"] as const)("passes %s to both active address consumers", (countryCode) => {
    const form = createInitialFormState("Test", "action");
    form.routeTopology = "point_to_point";

    const markup = renderToStaticMarkup(
      <PlannedActionLocationSection
        form={form}
        updateField={vi.fn()}
        updateFields={vi.fn()}
        countryCode={countryCode}
        hasAttemptedSubmit={false}
        validationIssueFields={[]}
      />,
    );

    expect(markup).toContain(`data-testid="before-departure-location" data-country-code="${countryCode}"`);
    expect(markup).toContain(`data-testid="before-arrival-location" data-country-code="${countryCode}"`);
  });
});

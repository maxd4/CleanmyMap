import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { DEFAULT_POLLUTION_SCORE_REFERENCES } from "@/lib/actions/pollution/pollution-score";
import { useActionPollutionScoreReferences } from "./action-pollution-score-references-context";

function HookConsumer() {
  const { references, isLoading, error } = useActionPollutionScoreReferences();

  return (
    <div>
      <output data-field="waste-reference">{references.wastePerVolunteer}</output>
      <output data-field="butts-reference">{references.buttsPerVolunteer}</output>
      <output data-field="is-loading">{String(isLoading)}</output>
      <output data-field="error">{error === null ? "null" : error}</output>
    </div>
  );
}

describe("action pollution score references context", () => {
  it("falls back to safe defaults outside the provider", () => {
    const html = renderToString(<HookConsumer />);

    expect(html).toContain(`data-field="waste-reference">${DEFAULT_POLLUTION_SCORE_REFERENCES.wastePerVolunteer}`);
    expect(html).toContain(`data-field="butts-reference">${DEFAULT_POLLUTION_SCORE_REFERENCES.buttsPerVolunteer}`);
    expect(html).toContain('data-field="is-loading">false');
    expect(html).toContain('data-field="error">null');
  });
});

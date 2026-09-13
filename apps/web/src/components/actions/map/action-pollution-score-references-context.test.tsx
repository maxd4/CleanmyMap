import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { useActionPollutionScoreReferences } from "./action-pollution-score-references-context";

function HookConsumer() {
  const { references, isLoading, error } = useActionPollutionScoreReferences();

  return (
    <div>
      <output data-field="references">
        {references ? JSON.stringify(references.global) : "null"}
      </output>
      <output data-field="is-loading">{String(isLoading)}</output>
      <output data-field="error">{error === null ? "null" : error}</output>
    </div>
  );
}

describe("action pollution score references context", () => {
  it("stays explicitly unavailable outside the provider instead of using old defaults", () => {
    const html = renderToString(<HookConsumer />);

    expect(html).toContain('data-field="references">null');
    expect(html).toContain('data-field="is-loading">false');
    expect(html).toContain('data-field="error">null');
  });
});

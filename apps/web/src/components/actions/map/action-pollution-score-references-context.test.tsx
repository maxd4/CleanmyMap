import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { useActionPollutionScoreReferences } from "./action-pollution-score-references-context";

function HookConsumer() {
  const { references, isLoading, error } = useActionPollutionScoreReferences();

  return (
    <pre>
      {JSON.stringify(
        {
          references,
          isLoading,
          error,
        },
        null,
        2,
      )}
    </pre>
  );
}

describe("action pollution score references context", () => {
  it("falls back to safe defaults outside the provider", () => {
    const html = renderToString(<HookConsumer />);

    expect(html).toContain("20");
    expect(html).toContain("2000");
    expect(html).toContain("\"isLoading\": false");
    expect(html).toContain("\"error\": null");
  });
});

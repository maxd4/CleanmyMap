import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LearnBehaviorAwarenessSection } from "./learn-behavior-awareness-section";

describe("LearnBehaviorAwarenessSection", () => {
  it("renders the awareness section and its three reference cards", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LearnBehaviorAwarenessSection, {
        locale: "fr",
      }),
    );

    expect(markup).toContain("Comportement et sensibilisation");
    expect(markup).toContain("Gestes Propres");
    expect(markup).toContain("ADEME");
    expect(markup).toContain("Ministère");
    expect(markup).toContain("Montrer l’exemple");
    expect(markup).toContain("Accompagner le changement");
    expect(markup).toContain("Prévention collective");
  });
});

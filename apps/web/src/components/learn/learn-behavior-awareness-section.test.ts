import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LearnBehaviorAwarenessSection } from "./learn-behavior-awareness-section";

describe("LearnBehaviorAwarenessSection", () => {
  it("renders the practical cues and the optional source section", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LearnBehaviorAwarenessSection, {
        locale: "fr",
      }),
    );

    expect(markup).toContain("Repères pratiques");
    expect(markup).toContain("Le geste tient mieux");
    expect(markup).toContain("Montrer le bon geste");
    expect(markup).toContain("Répéter une consigne courte");
    expect(markup).toContain("Préparer le contexte");
    expect(markup).toContain("Pour aller plus loin");
    expect(markup).toContain("Gestes Propres");
    expect(markup).toContain("ADEME");
    expect(markup).toContain("Ministère");
  });
});

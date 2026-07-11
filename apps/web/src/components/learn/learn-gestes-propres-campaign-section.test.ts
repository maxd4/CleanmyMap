import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LearnGestesPropresCampaignSection } from "./learn-gestes-propres-campaign-section";

describe("LearnGestesPropresCampaignSection", () => {
  it("renders the featured campaign and the four situations", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LearnGestesPropresCampaignSection, {
        locale: "fr",
      }),
    );

    expect(markup).toContain("Campagne à la une");
    expect(markup).toContain("Ça va pas s’faire tout seul !");
    expect(markup).toContain("Campagne Gestes Propres · 2025–2026");
    expect(markup).toContain("Source : Gestes Propres · 2025-2026");
    expect(markup).toContain("Mégot");
    expect(markup).toContain("Canette");
    expect(markup).toContain("Bouteille");
    expect(markup).toContain("Armoire / encombrant");
    expect(markup).toContain("/sections/trash-spotter");
    expect(markup).toContain("/sections/recycling");
    expect(markup).toContain("/actions/map");
  });
});

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/use-in-view-once", () => ({
  useInViewOnce: () => ({
    ref: React.createRef<HTMLDivElement>(),
    isInView: false,
  }),
}));

import {
  DeferredEnvironmentalQuiz,
  DeferredLearnVulgarisationMagnitudeComparator,
} from "./learn-deferred-panels";

describe("learn-deferred-panels", () => {
  it("keeps the comparator collapsed until it is near the viewport", () => {
    const markup = renderToStaticMarkup(
      React.createElement(DeferredLearnVulgarisationMagnitudeComparator, {
        locale: "en",
      }),
    );

    expect(markup).toContain("Loading the deep dive");
    expect(markup).toContain("role=\"status\"");
    expect(markup).toContain("aria-live=\"polite\"");
  });

  it("keeps the quiz shell lightweight before the in-view trigger fires", () => {
    const markup = renderToStaticMarkup(
      React.createElement(DeferredEnvironmentalQuiz, {
        locale: "en",
        initialAccessType: null,
        initialCollectiveMode: false,
        initialDemoMode: false,
        initialSchoolTrack: null,
      }),
    );

    expect(markup).toContain("The quiz activates as you approach the section.");
    expect(markup).toContain("role=\"status\"");
    expect(markup).toContain("aria-busy=\"true\"");
  });
});

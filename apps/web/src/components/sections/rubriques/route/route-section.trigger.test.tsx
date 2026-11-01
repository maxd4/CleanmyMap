import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));

import { RouteRecommendationTrigger } from "./route-section.trigger";

describe("RouteRecommendationTrigger guided validation", () => {
  it("blocks calculation and exposes the client validation error", () => {
    const markup = renderToStaticMarkup(
      <RouteRecommendationTrigger
        fr
        originMode="browser"
        mapOrigin={null}
        isLoaded
        isSignedIn
        isLoading={false}
        isRequestInFlight={false}
        isResolvingOrigin={false}
        recommendationRequested={false}
        planningModeError="Le passage « Passage 1 » du groupe « Groupe 1 » est hors de son secteur."
        requestRecommendation={vi.fn(async () => undefined)}
      />,
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("hors de son secteur");
    expect(markup).toContain("disabled=\"\"");
  });

  it("keeps calculation enabled when the guided configuration is valid", () => {
    const markup = renderToStaticMarkup(
      <RouteRecommendationTrigger
        fr
        originMode="browser"
        mapOrigin={null}
        isLoaded
        isSignedIn
        isLoading={false}
        isRequestInFlight={false}
        isResolvingOrigin={false}
        recommendationRequested={false}
        planningModeError={null}
        requestRecommendation={vi.fn(async () => undefined)}
      />,
    );

    expect(markup).not.toContain('disabled=""');
    expect(markup).toContain("Calculer la recommandation");
  });
});

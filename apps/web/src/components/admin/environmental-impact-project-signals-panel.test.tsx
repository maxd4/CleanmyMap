import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EnvironmentalImpactProjectSignalsPanel } from "./environmental-impact-project-signals-panel";
import { PROFIL_ROUTE } from "@/lib/accueil-pilotage-routes";

describe("EnvironmentalImpactProjectSignalsPanel", () => {
  it("renders the fine-grained project signal block", () => {
    const markup = renderToStaticMarkup(
      React.createElement(EnvironmentalImpactProjectSignalsPanel, {
        signals: {
          traffic: {
            pageViewEvents: 12,
            legacyPageViewEvents: 4,
            distinctRoutes: 3,
            topRoutes: [
              { path: "/community", count: 5 },
              { path: PROFIL_ROUTE, count: 4 },
            ],
          },
          community: {
            events: 2,
            rsvps: 3,
            notifications: 4,
            unreadNotifications: 1,
          },
          communication: {
            emailsSent: 7,
            pdfExports: 2,
          },
        },
      }),
    );

    expect(markup).toContain("Signaux projet détaillés");
    expect(markup).toContain("Routes les plus vues");
    expect(markup).toContain("/community");
    expect(markup).toContain("Communauté");
    expect(markup).toContain("Communications");
    expect(markup).toContain("emails envoyés");
    expect(markup).toContain("Volumes plafonnés");
  });
});

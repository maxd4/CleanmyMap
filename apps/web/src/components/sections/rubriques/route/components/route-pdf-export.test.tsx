import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RouteResponse } from "@/lib/route/route-response-contract";
import { RoutePdfExport } from "./route-pdf-export";

const multiRouteData = {
  groupRoutes: [{ groupIndex: 1 }, { groupIndex: 2 }],
} as unknown as RouteResponse;

const singleRouteData = {
  groupRoutes: [{ groupIndex: 1 }],
} as unknown as RouteResponse;

describe("RoutePdfExport", () => {
  it("warns before a color export when several loops may be printed in black and white", () => {
    const markup = renderToStaticMarkup(
      <RoutePdfExport
        data={multiRouteData}
        displayMode="colors"
        onUsePatterns={() => undefined}
      />,
    );

    expect(markup).toContain("Imprimer / exporter en PDF");
    expect(markup).toContain(
      "Ouvre la fiche terrain prête à imprimer ou à enregistrer en PDF.",
    );
    expect(markup).toContain(
      "A4 paysage · échelle 100 % · arrière-plans activés pour la couleur",
    );
    expect(markup).toContain("Vous prévoyez une impression en noir et blanc ?");
    expect(markup).toContain("Utiliser des formes différentes");
  });

  it("does not show the monochrome warning for a single loop or pattern mode", () => {
    const singleMarkup = renderToStaticMarkup(
      <RoutePdfExport
        data={singleRouteData}
        displayMode="colors"
        onUsePatterns={() => undefined}
      />,
    );
    const patternMarkup = renderToStaticMarkup(
      <RoutePdfExport
        data={multiRouteData}
        displayMode="patterns"
        onUsePatterns={() => undefined}
      />,
    );

    expect(singleMarkup).not.toContain("Vous prévoyez une impression en noir et blanc ?");
    expect(patternMarkup).not.toContain("Vous prévoyez une impression en noir et blanc ?");
  });
});

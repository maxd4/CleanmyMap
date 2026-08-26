import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KpiMethodBlock } from "./kpi-method-block";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import { buildMethods } from "@/lib/pilotage/overview.methods";

describe("KpiMethodBlock", () => {
  it("renders every runtime method with its formula in an accessible disclosure", () => {
    const methods = buildMethods();
    const markup = renderToStaticMarkup(
      React.createElement(KpiMethodBlock, { methods, title: "Méthode KPI" }),
    );
    const renderedText = markup.replaceAll("&#x27;", "'");

    expect(methods).toHaveLength(8);
    expect((markup.match(/<details/g) ?? []).length).toBe(methods.length);
    expect((markup.match(/<summary/g) ?? []).length).toBe(methods.length);
    expect(markup).toContain("md:grid-cols-2");
    expect(markup).toContain("focus-visible:outline-2");
    expect(markup).toContain(IMPACT_PROXY_CONFIG.version);

    for (const method of methods) {
      expect(markup).toContain(method.kpi);
      expect(markup).toContain(method.formula);
      expect(markup).toContain(method.source);
      expect(renderedText).toContain(method.recalc);
      expect(renderedText).toContain(method.limits);
    }
  });

  it("does not expose invented version, live, audit, or dead-link claims", () => {
    const markup = renderToStaticMarkup(
      React.createElement(KpiMethodBlock, {
        methods: buildMethods(),
      }),
    );

    expect(markup).not.toContain("Institutional Standard v2.4");
    expect(markup).not.toContain("Live Computation Engine Active");
    expect(markup).not.toContain("Audité par l'équipe scientifique");
    expect(markup).not.toContain("Consulter le livre blanc");
  });
});

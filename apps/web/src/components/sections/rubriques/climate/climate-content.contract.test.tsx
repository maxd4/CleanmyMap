import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { computeClimateContext } from "@/lib/analytics/climate-context";
import { ClimateProxyNotice } from "./climate-components";

const climateSection = readFileSync(new URL("./climate-section.tsx", import.meta.url), "utf8");
const climateComponents = readFileSync(
  new URL("./climate-components.tsx", import.meta.url),
  "utf8",
);
const methodologyClient = readFileSync(
  new URL("../methodologie-page-client.tsx", import.meta.url),
  "utf8",
);
const methodologyVisual = readFileSync(
  new URL("../free-plan-services-methodology-visual.impact.tsx", import.meta.url),
  "utf8",
);

describe("Climate public content contract", () => {
  it("does not publish unsupported percentages, biodiversity causality, or critical alerts", () => {
    const source = `${climateSection}\n${climateComponents}`;

    expect(source).not.toMatch(/80\s*%/);
    expect(source).not.toMatch(/protégeant directement la biodiversité|directly protecting marine biodiversity/i);
    expect(source).not.toMatch(/pression critique|critical pressure|intervention prioritaire|priority intervention/i);
    expect(source).not.toContain("ClimateAlertBanner");
    expect(source).not.toContain("Alerte Impact");
    expect(source).not.toContain("Détails");
  });

  it("keeps proxy limits and the actual model version visible beside the KPIs", () => {
    const context = computeClimateContext({
      records: [],
      periodDays: 30,
      now: new Date("2026-09-25T00:00:00.000Z"),
    });
    const markup = renderToStaticMarkup(
      <ClimateProxyNotice version={context.modelVersion} fr />,
    );

    expect(climateSection).toContain(
      "<ClimateProxyNotice version={context.modelVersion} fr={fr} />",
    );
    expect(markup).toContain("proxies de pilotage");
    expect(markup).toContain("ne sont pas des mesures instrumentales");
    expect(markup).toContain("ne constituent pas un bilan carbone complet");
    expect(markup).toContain(`Modèle ${context.modelVersion}`);
  });

  it("uses a snapshot wording without claiming real-time freshness", () => {
    expect(climateSection).toContain("Snapshot d’impact");
    expect(climateSection).toContain("Recalculé à chaque chargement");
    expect(climateSection).not.toMatch(/Flux Temps Réel|Real[- ]time flow|Calculé à l'instant|Calculated just now/i);
    expect(climateSection).not.toContain("generatedAt");
  });

  it("links the water-impact CTA to the existing methodology anchor", () => {
    expect(climateSection).toContain('href="/methodologie#impact-services"');
    expect(methodologyClient).toContain('sectionId="impact-services"');
    expect(methodologyVisual).toContain("id={sectionId}");
  });
});

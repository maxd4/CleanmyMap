import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./page-client.tsx", import.meta.url), "utf8");
const serverSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const controlTowerSource = readFileSync(
  new URL("./_components/map-control-tower.tsx", import.meta.url),
  "utf8",
);

describe("actions map public semantics", () => {
  it("does not label the map as real-time data", () => {
    expect(source).not.toContain("Données en temps réel");
    expect(source).toContain("pollution projetée");
    expect(source).toContain("ne constituent pas une mesure actuelle du terrain");
  });

  it("keeps the public feed approved-only without exposing a status control", () => {
    expect(source).toContain('statusFilter: "approved"');
    expect(source).not.toContain("setStatusFilter");
    expect(source).not.toContain("handleStatusChange");
    expect(source).not.toContain("onStatusChange");
  });

  it("keeps the methodology CTA and removes secondary technical surfaces", () => {
    expect(source).toContain('href="/methodologie"');
    expect(source).not.toContain("MapSidebarAid");
    expect(source).toContain("Analyse &amp; journal");
    expect(controlTowerSource).not.toContain("buildActionsMapGeoQuality");
    expect(controlTowerSource).not.toContain("Qualité géo");
    expect(controlTowerSource).not.toContain("Sans coord.");
    expect(controlTowerSource).not.toContain("Fallback");
    expect(controlTowerSource).toContain("ActionsMapFilterControls");
    expect(controlTowerSource).toContain("ActionsMapExportButton");
    expect(controlTowerSource).toContain("visibleCount");
    expect(controlTowerSource).toContain("loadedCount");
  });

  it("passes canonical public Impact metrics from the server boundary", () => {
    expect(serverSource).toContain("loadLandingSummary");
    expect(serverSource).toContain("summary.counters");
    expect(serverSource).toContain("buildPublicImpactMetrics");
    expect(source).toContain("impactMetrics: PublicImpactMetric[]");
    expect(source).toContain("<MapKpiRibbon metrics={impactMetrics} />");
    expect(source).not.toContain("useMapKpiStats");
    expect(source).not.toContain("buildPublicImpactMetrics");
    expect(source).not.toContain("sumActionImpactKpis");
  });
});

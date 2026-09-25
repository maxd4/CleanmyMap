import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./page-client.tsx", import.meta.url), "utf8");
const serverSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const loadingSource = readFileSync(new URL("./loading.tsx", import.meta.url), "utf8");
const controlTowerSource = readFileSync(
  new URL("./_components/map-control-tower.tsx", import.meta.url),
  "utf8",
);
const canvasSource = readFileSync(
  new URL("../../../../components/actions/actions-map-canvas.tsx", import.meta.url),
  "utf8",
);

describe("actions map public semantics", () => {
  it("keeps the primary heading in the server boundary and the subtitle dynamic in the client boundary", () => {
    expect(serverSource).toContain("<h1");
    expect(serverSource).toContain("Cartographie des actions");
    expect(serverSource).toContain("<Suspense");
    expect(serverSource).toContain("async function ActionsMapContent");
    expect(loadingSource).toContain("<h1");
    expect(loadingSource).toContain("Cartographie des actions");
    expect(source).toContain("title={null}");
    expect(source).toContain("scoreScope === \"department\"");
    expect(source).toContain('displayMode === "observed"');
    expect(source).not.toContain('title="Cartographie des actions"');
  });

  it("does not label the map as real-time data", () => {
    expect(source).not.toContain("Données en temps réel");
    expect(source).toContain("pollution projetée");
    expect(source).toContain("ne constitue pas une mesure actuelle du terrain");
  });

  it("keeps the public feed approved-only without exposing a status control", () => {
    expect(source).toContain("statusFilter: ACTIONS_MAP_PUBLIC_FEED_DEFAULTS.statusFilter");
    expect(source).not.toContain("setStatusFilter");
    expect(source).not.toContain("handleStatusChange");
    expect(source).not.toContain("onStatusChange");
  });

  it("keeps the methodology CTA and removes secondary technical surfaces", () => {
    expect(source).toContain('href="/methodologie"');
    expect(source).not.toContain("MapSidebarAid");
    expect(source).toContain("Journal des actions");
    expect(source).toContain('href="/reports"');
    expect(source).not.toContain("ActionStoriesCarousel");
    expect(source).not.toContain("ActionsVisualizationPanel");
    expect(source).not.toContain("Dernières actions");
    expect(source).not.toContain("Action urgente");
    expect(source).not.toContain("images.unsplash.com");
    expect(source).not.toContain("<aside");
    expect(controlTowerSource).not.toContain("buildActionsMapGeoQuality");
    expect(controlTowerSource).not.toContain("Qualité géo");
    expect(controlTowerSource).not.toContain("Sans coord.");
    expect(controlTowerSource).not.toContain("Fallback");
    expect(controlTowerSource).not.toContain("ActionsMapFilterControls");
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

  it("keeps map counts contextual and separate from public Impact metrics", () => {
    expect(source).toContain("const visibleCount = filteredMapItems.length");
    expect(source).toContain("const loadedCount = mapFeedDataForView.allItems.length");
    expect(source).not.toContain("useMapKpiStats");
    expect(source).not.toContain("stats.wasteKg");
    expect(source).not.toContain("stats.co2AvoidedKg");
    expect(source).not.toContain("stats.euroSaved");
  });

  it("keeps the public map controls consolidated on the canvas", () => {
    expect(canvasSource).toContain("Filtrer");
    expect(canvasSource).toContain("Affichage");
    expect(canvasSource).toContain("Légende");
    expect(canvasSource).toContain('position="right"');
    expect(canvasSource).not.toContain("LayersControl");
    expect(source).toContain("filters={filters}");
    expect(source).toContain("onDateScopeChange={handleDateScopeChange}");
  });
});

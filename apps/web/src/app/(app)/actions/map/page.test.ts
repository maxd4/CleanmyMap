import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
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
});

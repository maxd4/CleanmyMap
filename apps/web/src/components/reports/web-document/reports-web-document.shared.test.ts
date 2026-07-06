import { describe, expect, it } from "vitest";
import {
  buildRecentReports,
  buildReportTitle,
  buildScopeSelectValue,
  detailLevelLabel,
  detailLevelToModules,
  parseScopeSelectValue,
} from "./reports-web-document.shared";

describe("reports web document shared helpers", () => {
  it("round-trips scope select values", () => {
    expect(buildScopeSelectValue("account", "compte-1")).toBe("account:compte-1");
    expect(parseScopeSelectValue("account:compte-1")).toEqual({
      kind: "account",
      value: "compte-1",
    });
    expect(parseScopeSelectValue("invalid")).toEqual({
      kind: "global",
      value: "",
    });
  });

  it("maps detail levels to module toggles", () => {
    expect(detailLevelToModules("concis")).toEqual({
      dataAndCartography: true,
      environmentalImpact: true,
      rawData: false,
      detailedFiles: false,
    });
    expect(detailLevelToModules("exhaustif")).toEqual({
      dataAndCartography: true,
      environmentalImpact: true,
      rawData: true,
      detailedFiles: true,
    });
  });

  it("builds readable report labels", () => {
    expect(detailLevelLabel("default")).toBe("Par défaut (12 à 16 pages)");
    expect(buildReportTitle("Global", "default")).toBe("Rapport d'impact - Global - Par défaut");

    const rows = buildRecentReports({
      overview: { generatedAt: "2026-05-04T14:30:00.000Z" } as never,
      activeScopeLabel: "Global",
      period: "current_year",
      detailLevel: "default",
    });

    expect(rows).toHaveLength(3);
    expect(rows[0]?.period).toBe("Année en cours");
    expect(rows[2]?.detail).toBe("Exhaustif (20 à 28 pages)");
  });
});

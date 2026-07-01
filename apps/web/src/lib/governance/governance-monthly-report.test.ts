import { expect, it } from "vitest";
import { buildGovernanceMonthlyReportLines, buildGovernanceMonthlyReportPayload } from "./governance-monthly-report";
import { report } from "./governance-monthly-report.fixtures";
import { highRiskEnvironmentalImpact, highRiskStorageUsage } from "./governance-monthly-report-high-risk.fixtures";

it("builds a readable monthly report payload", () => {
    expect(report.reportMonth).toBe("2026-05-01");
    expect(report.summary[0]).toContain("Risque global du mois");
    expect(report.summary[1]).toContain("Service le plus exposé");
    expect(report.summary[2]).toContain("Catégorie métier la plus coûteuse");
    expect(report.summary[3]).toContain("Alerte principale");
  });

  it("builds PDF lines with the main sections", () => {
    const lines = buildGovernanceMonthlyReportLines({
      id: "governance-2026-05-01",
      reportKey: "cleanmymap-governance",
      reportMonth: report.reportMonth,
      generatedAt: report.generatedAt,
      version: "governance-monthly-report-2026.05-v1",
      title: "Rapport mensuel de gouvernance",
      payload: report,
    }, [
      {
        id: "governance-2026-05-01",
        reportKey: "cleanmymap-governance",
        reportMonth: "2026-05-01",
        generatedAt: "2026-05-20T12:00:00.000Z",
        version: "governance-monthly-report-2026.05-v1",
        title: "Rapport mensuel de gouvernance",
        payload: report,
      },
      {
        id: "governance-2026-04-01",
        reportKey: "cleanmymap-governance",
        reportMonth: "2026-04-01",
        generatedAt: "2026-04-20T12:00:00.000Z",
        version: "governance-monthly-report-2026.04-v1",
        title: "Rapport mensuel de gouvernance",
        payload: {
          ...report,
          generatedAt: "2026-04-20T12:00:00.000Z",
          reportMonth: "2026-04-01",
          reportMonthLabel: "avril 2026",
        },
      },
      {
        id: "governance-2026-03-01",
        reportKey: "cleanmymap-governance",
        reportMonth: "2026-03-01",
        generatedAt: "2026-03-20T12:00:00.000Z",
        version: "governance-monthly-report-2026.03-v1",
        title: "Rapport mensuel de gouvernance",
        payload: {
          ...report,
          generatedAt: "2026-03-20T12:00:00.000Z",
          reportMonth: "2026-03-01",
          reportMonthLabel: "mars 2026",
        },
      },
    ]);

    expect(lines.join("\n")).toContain("Rapport mensuel de gouvernance");
    expect(lines.join("\n")).toContain("Couverture");
    expect(lines.join("\n")).toContain("Risque global du mois");
    expect(lines.join("\n")).toContain("Quota restant");
    expect(lines.join("\n")).toContain("Stockage global");
    expect(lines.join("\n")).toContain("Découpage métier");
    expect(lines.join("\n")).toContain("Camembert mensuel");
    expect(lines.join("\n")).toContain("Dérive mensuelle");
    expect(lines.join("\n")).toContain("Lecture pilotage");
    expect(lines.join("\n")).toContain("Évolution par service");
    expect(lines.join("\n")).toContain("Franchissements de seuils");
    expect(lines.join("\n")).toContain("Top 3 hausses");
    expect(lines.join("\n")).toContain("mai 2026");
    expect(lines.join("\n")).toContain("Socle d’estimateur d’impact environnemental");
    expect(lines.join("\n")).toContain("Communications: emails, messages, pièces jointes");
    expect(lines.join("\n")).toContain("Terrain: actions, photos, preuves");
    expect(lines.join("\n")).toContain("Compte utilisateur");
    expect(lines.join("\n")).toContain("Gamification");
    expect(lines.join("\n")).toContain("Alertes de gouvernance");
    expect(lines.join("\n")).toContain("Méthodologie et liens");
    expect(lines.filter((line) => line === "\f")).toHaveLength(11);
  });


  it("elevates critical services and emits the governance banner when the risk is high", () => {
    const generatedAt = "2026-05-20T12:00:00.000Z";
    const highRiskReport = buildGovernanceMonthlyReportPayload({
      generatedAt,
      environmentalImpact: highRiskEnvironmentalImpact,
      storageUsage: highRiskStorageUsage,
    });

    const lines = buildGovernanceMonthlyReportLines(
      {
        id: "governance-2026-05-01",
        reportKey: "cleanmymap-governance",
        reportMonth: highRiskReport.reportMonth,
        generatedAt: highRiskReport.generatedAt,
        version: "governance-monthly-report-2026.05-v1",
        title: "Rapport mensuel de gouvernance",
        payload: highRiskReport,
      },
      [],
    );

    expect(highRiskReport.summary[1]).toContain("Service le plus exposé: Supabase");
    expect(highRiskReport.summary[4]).toContain("Bandeau rouge de gouvernance");
    expect(lines.join("\n")).toContain("!! Bandeau rouge de gouvernance");
    expect(lines.join("\n")).toContain("Exports du socle trop lourds");
});

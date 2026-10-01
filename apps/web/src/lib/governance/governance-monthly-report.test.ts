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

    expect(highRiskReport.summary[1]).toContain("Service le plus exposé: Vercel");
    expect(highRiskReport.summary[4]).toContain("Bandeau rouge de gouvernance");
    expect(lines.join("\n")).toContain("!! Bandeau rouge de gouvernance");
    expect(lines.join("\n")).toContain("Exports du socle trop lourds");
  });

  it("keeps unknown measures distinct from an observed zero and only computes complete deltas", () => {
    const currentServices = highRiskEnvironmentalImpact.model.infrastructure.services.map((service, index) =>
      index === 0
        ? { ...service, monthlyKgCo2eProxy: null }
        : { ...service, monthlyKgCo2eProxy: 0 },
    );
    const previousServices = highRiskEnvironmentalImpact.snapshots[1].model.infrastructure.services.map(
      (service, index) =>
        index === 0 ? { ...service, monthlyKgCo2eProxy: null } : { ...service, monthlyKgCo2eProxy: 0 },
    );
    const environmentalImpact = {
      ...highRiskEnvironmentalImpact,
      model: {
        ...highRiskEnvironmentalImpact.model,
        infrastructure: {
          ...highRiskEnvironmentalImpact.model.infrastructure,
          services: currentServices,
        },
      },
      snapshots: [
        highRiskEnvironmentalImpact.snapshots[0],
        {
          ...highRiskEnvironmentalImpact.snapshots[1],
          model: {
            ...highRiskEnvironmentalImpact.snapshots[1].model,
            infrastructure: {
              ...highRiskEnvironmentalImpact.snapshots[1].model.infrastructure,
              services: previousServices,
            },
          },
        },
      ],
    } as typeof highRiskEnvironmentalImpact;

    const payload = buildGovernanceMonthlyReportPayload({
      generatedAt: "2026-05-20T12:00:00.000Z",
      environmentalImpact,
      storageUsage: highRiskStorageUsage,
    });

    expect(payload.impact.serviceBreakdown.find((service) => service.key === "supabase")).toMatchObject({
      currentKgCo2eProxy: null,
      previousKgCo2eProxy: null,
      deltaKgCo2eProxy: null,
    });
    expect(payload.impact.serviceBreakdown.find((service) => service.key === "vercel")).toMatchObject({
      currentKgCo2eProxy: 0,
      previousKgCo2eProxy: 0,
      deltaKgCo2eProxy: 0,
    });
    expect(payload.impact.topServiceLabel).toBe("Vercel");
    expect(payload.impact.topServiceMonthlyKgCo2eProxy).toBe(0);
    expect(payload.summary[1]).toContain("Vercel (0 kg");
  });

  it("does not expose an exposure leader when every service measure is unknown", () => {
    const currentOnlyPayload = buildGovernanceMonthlyReportPayload({
      generatedAt: "2026-05-20T12:00:00.000Z",
      environmentalImpact: { ...highRiskEnvironmentalImpact, snapshots: [] },
      storageUsage: highRiskStorageUsage,
    });
    expect(currentOnlyPayload.impact.serviceBreakdown.find((service) => service.key === "supabase")).toMatchObject({
      currentKgCo2eProxy: 2.4,
      previousKgCo2eProxy: null,
      deltaKgCo2eProxy: null,
    });

    const environmentalImpact = {
      ...highRiskEnvironmentalImpact,
      model: {
        ...highRiskEnvironmentalImpact.model,
        infrastructure: {
          ...highRiskEnvironmentalImpact.model.infrastructure,
          monthlyKgCo2eProxy: null,
          services: highRiskEnvironmentalImpact.model.infrastructure.services.map((service) => ({
            ...service,
            monthlyKgCo2eProxy: null,
          })),
        },
      },
      snapshots: [],
    } as typeof highRiskEnvironmentalImpact;

    const payload = buildGovernanceMonthlyReportPayload({
      generatedAt: "2026-05-20T12:00:00.000Z",
      environmentalImpact,
      storageUsage: highRiskStorageUsage,
    });

    expect(payload.impact.topServiceLabel).toBeNull();
    expect(payload.impact.topServiceMonthlyKgCo2eProxy).toBeNull();
    expect(payload.summary[1]).toContain("aucune donnée");
  });

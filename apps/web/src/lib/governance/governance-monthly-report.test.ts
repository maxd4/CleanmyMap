import { describe, expect, it } from "vitest";
import { buildGovernanceMonthlyReportLines, buildGovernanceMonthlyReportPayload } from "./governance-monthly-report";

describe("governance monthly report", () => {
  const report = buildGovernanceMonthlyReportPayload({
    generatedAt: "2026-05-20T12:00:00.000Z",
    environmentalImpact: {
      status: "ok",
      model: {
        generatedAt: "2026-05-20T12:00:00.000Z",
        infrastructure: {
          monthlyKgCo2eProxy: 3.4,
          confidencePercent: 88,
          services: [
            {
              key: "supabase",
              label: "Supabase",
              monthlyKgCo2eProxy: 2.4,
              sharePercent: 61,
              confidencePercent: 84,
              uncertaintyPercent: 11,
              status: "ready",
            },
            {
              key: "vercel",
              label: "Vercel",
              monthlyKgCo2eProxy: 1.0,
              sharePercent: 29,
              confidencePercent: 82,
              uncertaintyPercent: 8,
              status: "ready",
            },
          ],
        },
      },
      signals: {
        generatedAt: "2026-05-20T12:00:00.000Z",
        signalBreakdown: {
          traffic: {
            pageViewEvents: 2,
            legacyPageViewEvents: 2,
            distinctRoutes: 2,
            topRoutes: [
              { path: "/community", count: 1 },
              { path: "/profil", count: 1 },
            ],
          },
          community: {
            events: 1,
            rsvps: 2,
            notifications: 2,
            unreadNotifications: 1,
          },
          communication: {
            emailsSent: 2,
            pdfExports: 1,
          },
        },
      },
      snapshots: [
        {
          snapshotDate: "2026-05-20",
      model: {
        infrastructure: {
          services: [
            {
              key: "supabase",
              monthlyKgCo2eProxy: 2.4,
              sharePercent: 61,
              confidencePercent: 84,
              uncertaintyPercent: 11,
              status: "ready",
            },
            {
              key: "vercel",
              monthlyKgCo2eProxy: 1.0,
              sharePercent: 29,
              confidencePercent: 82,
              uncertaintyPercent: 8,
              status: "ready",
            },
          ],
        },
      },
        },
      ] as never,
      version: "environmental-impact-estimator-2026.05-v1",
    } as unknown as Parameters<typeof buildGovernanceMonthlyReportPayload>[0]["environmentalImpact"],
    storageUsage: {
      current: {
        quotaBytes: 1_000_000,
        quotaLabel: "1 MB",
        totalBytes: 120_000,
        totalLabel: "120 KB",
        remainingBytes: 880_000,
        remainingLabel: "880 KB",
        usagePercent: 12,
        objectCount: 4,
        bucketCount: 2,
        bucketBreakdown: [{ key: "a", label: "Bucket A", bytes: 70_000, count: 2, sharePercent: 58.3, averageBytes: 35_000 }],
        extensionBreakdown: [{ key: "pdf", label: "PDF", bytes: 80_000, count: 1, sharePercent: 66.6, averageBytes: 80_000 }],
        businessBreakdown: [],
        largestFiles: [],
        source: "default_free",
        warnings: [],
        generatedAt: "2026-05-20T12:00:00.000Z",
        snapshotMonth: "2026-05-01",
      },
      businessContributions: {
        previousSnapshotMonth: "2026-04-01",
        historyMonths: ["2026-05-01", "2026-04-01", "2026-03-01"],
        alerts: [],
        items: [
          {
            id: "socle_estimateur_impact",
            label: "Socle d’estimateur d’impact",
            description: "Exports, rapports et livrables du socle d’estimation.",
            currentBytes: 90_000,
            currentCount: 3,
            currentSharePercent: 75,
            currentAverageBytes: 30_000,
            previousBytes: 60_000,
            previousCount: 2,
            deltaBytes: 30_000,
            deltaPercent: 50,
            deltaCount: 1,
            cumulative3MonthBytes: 30_000,
            cumulative3MonthPercent: 50,
            accelerationBytes: 10_000,
            accelerationPercent: 50,
            history: [
              {
                snapshotMonth: "2026-05-01",
                monthLabel: "mai 2026",
                currentBytes: 90_000,
                currentCount: 3,
                sharePercent: 75,
                deltaBytes: 30_000,
                deltaCount: 1,
                deltaPercent: 50,
                cumulative3MonthBytes: 30_000,
                cumulative3MonthPercent: 50,
                accelerationBytes: 10_000,
                accelerationPercent: 50,
              },
            ],
            topFiles: [
              {
                bucketId: "reports",
                bucketLabel: "reports",
                name: "reports/governance-mensuel.pdf",
                extension: "pdf",
                bytes: 45_000,
                sizeLabel: "45 KB",
                createdAt: null,
                updatedAt: null,
              },
            ],
            mimeSubtypes: [
              { key: "application/pdf", label: "application/pdf", bytes: 45_000, count: 1, sharePercent: 50, averageBytes: 45_000 },
            ],
            alerts: [],
          },
          {
            id: "emails",
            label: "Emails",
            description: "Courriels, pièces de mail et artefacts d’envoi.",
            currentBytes: 12_000,
            currentCount: 2,
            currentSharePercent: 10,
            currentAverageBytes: 6_000,
            previousBytes: 10_000,
            previousCount: 2,
            deltaBytes: 2_000,
            deltaPercent: 20,
            deltaCount: 0,
            cumulative3MonthBytes: 2_000,
            cumulative3MonthPercent: 20,
            accelerationBytes: 0,
            accelerationPercent: 0,
            history: [],
            topFiles: [],
            mimeSubtypes: [],
            alerts: [],
          },
          {
            id: "messages",
            label: "Messages",
            description: "Échanges conversationnels et fils de discussion.",
            currentBytes: 8_000,
            currentCount: 4,
            currentSharePercent: 6.7,
            currentAverageBytes: 2_000,
            previousBytes: 4_000,
            previousCount: 2,
            deltaBytes: 4_000,
            deltaPercent: 100,
            deltaCount: 2,
            cumulative3MonthBytes: 4_000,
            cumulative3MonthPercent: 100,
            accelerationBytes: 2_000,
            accelerationPercent: 100,
            history: [],
            topFiles: [],
            mimeSubtypes: [],
            alerts: [],
          },
          {
            id: "pieces_jointes_document",
            label: "Pièces jointes document",
            description: "PDF, tableurs et documents partagés.",
            currentBytes: 6_000,
            currentCount: 1,
            currentSharePercent: 5,
            currentAverageBytes: 6_000,
            previousBytes: 6_000,
            previousCount: 1,
            deltaBytes: 0,
            deltaPercent: 0,
            deltaCount: 0,
            cumulative3MonthBytes: 0,
            cumulative3MonthPercent: 0,
            accelerationBytes: 0,
            accelerationPercent: 0,
            history: [],
            topFiles: [],
            mimeSubtypes: [],
            alerts: [],
          },
          {
            id: "pieces_jointes_photo",
            label: "Pièces jointes photo",
            description: "Images jointes aux conversations ou aux formulaires.",
            currentBytes: 4_000,
            currentCount: 1,
            currentSharePercent: 3.3,
            currentAverageBytes: 4_000,
            previousBytes: 3_500,
            previousCount: 1,
            deltaBytes: 500,
            deltaPercent: 14.3,
            deltaCount: 0,
            cumulative3MonthBytes: 500,
            cumulative3MonthPercent: 14.3,
            accelerationBytes: 250,
            accelerationPercent: 100,
            history: [],
            topFiles: [],
            mimeSubtypes: [],
            alerts: [],
          },
          {
            id: "actions_terrain",
            label: "Actions terrain",
            description: "Données et médias liés aux missions terrain.",
            currentBytes: 70_000,
            currentCount: 2,
            currentSharePercent: 58.3,
            currentAverageBytes: 35_000,
            previousBytes: 50_000,
            previousCount: 1,
            deltaBytes: 20_000,
            deltaPercent: 40,
            deltaCount: 1,
            cumulative3MonthBytes: 20_000,
            cumulative3MonthPercent: 40,
            accelerationBytes: 10_000,
            accelerationPercent: 100,
            history: [],
            topFiles: [
              {
                bucketId: "mission-assets",
                bucketLabel: "mission-assets",
                name: "mission-1/video.mp4",
                extension: "mp4",
                bytes: 40_000,
                sizeLabel: "40 KB",
                createdAt: null,
                updatedAt: null,
              },
              {
                bucketId: "mission-assets",
                bucketLabel: "mission-assets",
                name: "mission-1/photo.jpg",
                extension: "jpg",
                bytes: 30_000,
                sizeLabel: "30 KB",
                createdAt: null,
                updatedAt: null,
              },
            ],
            mimeSubtypes: [],
            alerts: [],
          },
          {
            id: "donnees_utilisateur",
            label: "Données utilisateur",
            description: "Profils, avatars et contenus attachés aux comptes.",
            currentBytes: 3_000,
            currentCount: 1,
            currentSharePercent: 2.5,
            currentAverageBytes: 3_000,
            previousBytes: 2_000,
            previousCount: 1,
            deltaBytes: 1_000,
            deltaPercent: 50,
            deltaCount: 0,
            cumulative3MonthBytes: 1_000,
            cumulative3MonthPercent: 50,
            accelerationBytes: 500,
            accelerationPercent: 100,
            history: [],
            topFiles: [],
            mimeSubtypes: [],
            alerts: [],
          },
          {
            id: "badges_gamification",
            label: "Badges gamification",
            description: "Récompenses, avatars de progression et badges.",
            currentBytes: 1_000,
            currentCount: 1,
            currentSharePercent: 0.8,
            currentAverageBytes: 1_000,
            previousBytes: 500,
            previousCount: 1,
            deltaBytes: 500,
            deltaPercent: 100,
            deltaCount: 0,
            cumulative3MonthBytes: 500,
            cumulative3MonthPercent: 100,
            accelerationBytes: 250,
            accelerationPercent: 100,
            history: [],
            topFiles: [],
            mimeSubtypes: [],
            alerts: [],
          },
        ],
      },
      history: [
        {
          snapshotMonth: "2026-05-01",
          monthLabel: "mai 2026",
          generatedAt: "2026-05-20T12:00:00.000Z",
          totalBytes: 120_000,
          usagePercent: 12,
          bucketBreakdown: [],
          extensionBreakdown: [],
          businessBreakdown: [],
        },
      ],
      comparison: {
        previousSnapshotMonth: null,
        deltaBytes: 20_000,
        deltaPercent: 20,
        bucketGrowth: [],
        extensionGrowth: [],
      },
      warnings: [],
      timestamp: "2026-05-20T12:00:00.000Z",
      snapshotMonth: "2026-05-01",
      snapshotPersisted: false,
      cron: {
        configured: true,
        statusLabel: "Configuré",
        schedule: "0 3 1 * *",
        scheduleLabel: "1er du mois à 03:00 UTC",
        timezone: "UTC",
        nextRunAt: "2026-06-01T03:00:00.000Z",
        nextRunLabel: "1 juin 2026 à 03:00 UTC",
      },
    } as unknown as Parameters<typeof buildGovernanceMonthlyReportPayload>[0]["storageUsage"],
  });

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
    const highRiskEnvironmentalImpact = {
      status: "ok",
      model: {
        generatedAt,
        version: "environmental-impact-estimator-2026.05-v1",
        infrastructure: {
          monthlyKgCo2eProxy: 5.6,
          confidencePercent: 81,
          uncertaintyPercent: 10,
          services: [
            {
              key: "supabase",
              label: "Supabase",
              monthlyKgCo2eProxy: 2.4,
              sharePercent: 35,
              confidencePercent: 74,
              uncertaintyPercent: 18,
              status: "partial",
            },
            {
              key: "vercel",
              label: "Vercel",
              monthlyKgCo2eProxy: 3.2,
              sharePercent: 45,
              confidencePercent: 94,
              uncertaintyPercent: 4,
              status: "ready",
            },
          ],
        },
      },
      signals: {
        generatedAt,
        siteInput: { pageViews: 4 },
        userInput: {},
        infrastructureInput: {},
        signalBreakdown: {
          traffic: {
            pageViewEvents: 4,
            legacyPageViewEvents: 2,
            distinctRoutes: 2,
            topRoutes: [
              { path: "/community", count: 2 },
              { path: "/profil", count: 1 },
            ],
          },
          community: {
            events: 1,
            rsvps: 2,
            notifications: 1,
            unreadNotifications: 1,
          },
          communication: {
            emailsSent: 1,
            pdfExports: 1,
          },
        },
      },
      snapshots: [
        {
          snapshotDate: "2026-05-20",
          model: {
            generatedAt,
            version: "environmental-impact-estimator-2026.05-v1",
            infrastructure: {
              services: [
                {
                  key: "supabase",
                  monthlyKgCo2eProxy: 2.4,
                  sharePercent: 35,
                  confidencePercent: 74,
                  uncertaintyPercent: 18,
                  status: "partial",
                },
                {
                  key: "vercel",
                  monthlyKgCo2eProxy: 3.2,
                  sharePercent: 45,
                  confidencePercent: 94,
                  uncertaintyPercent: 4,
                  status: "ready",
                },
              ],
            },
          },
        },
        {
          snapshotDate: "2026-04-20",
          model: {
            generatedAt: "2026-04-20T12:00:00.000Z",
            version: "environmental-impact-estimator-2026.04-v1",
            infrastructure: {
              services: [
                {
                  key: "supabase",
                  monthlyKgCo2eProxy: 1.0,
                  sharePercent: 24,
                  confidencePercent: 76,
                  uncertaintyPercent: 18,
                  status: "partial",
                },
                {
                  key: "vercel",
                  monthlyKgCo2eProxy: 0.4,
                  sharePercent: 18,
                  confidencePercent: 91,
                  uncertaintyPercent: 5,
                  status: "ready",
                },
              ],
            },
          },
        },
      ],
      version: "environmental-impact-estimator-2026.05-v1",
    } as Parameters<typeof buildGovernanceMonthlyReportPayload>[0]["environmentalImpact"];

    const highRiskStorageUsage = {
      current: {
        quotaBytes: 1_000_000,
        quotaLabel: "1 MB",
        totalBytes: 920_000,
        totalLabel: "920 KB",
        remainingBytes: 80_000,
        remainingLabel: "80 KB",
        usagePercent: 92,
        objectCount: 12,
        bucketCount: 3,
        bucketBreakdown: [
          { key: "reports", label: "reports", bytes: 500_000, count: 5, sharePercent: 54.3, averageBytes: 100_000 },
          { key: "uploads", label: "uploads", bytes: 280_000, count: 4, sharePercent: 30.4, averageBytes: 70_000 },
          { key: "avatars", label: "avatars", bytes: 140_000, count: 3, sharePercent: 15.2, averageBytes: 46_667 },
        ],
        extensionBreakdown: [
          { key: "pdf", label: "PDF", bytes: 500_000, count: 5, sharePercent: 54.3, averageBytes: 100_000 },
          { key: "jpg", label: "JPG", bytes: 280_000, count: 4, sharePercent: 30.4, averageBytes: 70_000 },
        ],
        businessBreakdown: [],
        largestFiles: [],
        source: "default_free",
        warnings: ["Le quota gratuit approche de la saturation."],
        generatedAt,
        snapshotMonth: "2026-05-01",
      },
      businessContributions: {
        previousSnapshotMonth: "2026-04-01",
        historyMonths: ["2026-05-01", "2026-04-01", "2026-03-01"],
        alerts: [
          {
            label: "socle_estimateur_impact",
            severity: "critical",
            title: "Exports du socle trop lourds",
            message: "Les exports du socle dépassent le seuil cible de gouvernance.",
            signal: "heavyExports",
          },
          {
            label: "pieces_jointes_photo",
            severity: "warning",
            title: "Les pièces jointes photo dominent",
            message: "Les pièces jointes photo pèsent désormais trop dans le quota.",
            signal: "photoDominance",
          },
        ],
        items: [
          {
            id: "socle_estimateur_impact",
            label: "Socle d’estimateur d’impact environnemental",
            description: "Exports, rapports et livrables du socle d’estimation.",
            currentBytes: 500_000,
            currentCount: 5,
            currentSharePercent: 54.3,
            currentAverageBytes: 100_000,
            previousBytes: 320_000,
            previousCount: 4,
            deltaBytes: 180_000,
            deltaPercent: 56.3,
            deltaCount: 1,
            cumulative3MonthBytes: 220_000,
            cumulative3MonthPercent: 43.1,
            accelerationBytes: 80_000,
            accelerationPercent: 57.1,
            history: [
              {
                snapshotMonth: "2026-05-01",
                monthLabel: "mai 2026",
                currentBytes: 500_000,
                currentCount: 5,
                sharePercent: 54.3,
                deltaBytes: 180_000,
                deltaCount: 1,
                deltaPercent: 56.3,
                cumulative3MonthBytes: 220_000,
                cumulative3MonthPercent: 43.1,
                accelerationBytes: 80_000,
                accelerationPercent: 57.1,
              },
            ],
            topFiles: [
              {
                bucketId: "reports",
                bucketLabel: "reports",
                name: "reports/governance-mensuel.pdf",
                extension: "pdf",
                bytes: 250_000,
                sizeLabel: "250 KB",
                createdAt: null,
                updatedAt: null,
              },
            ],
            mimeSubtypes: [
              { key: "application/pdf", label: "application/pdf", bytes: 250_000, count: 1, sharePercent: 50, averageBytes: 250_000 },
            ],
            alerts: [
              {
                severity: "critical",
                title: "Exports du socle trop lourds",
                message: "Le socle prend trop de place dans le quota.",
                signal: "heavyExports",
              },
            ],
          },
          {
            id: "pieces_jointes_photo",
            label: "Pièces jointes photo",
            description: "Photos terrain et pièces jointes visuelles.",
            currentBytes: 420_000,
            currentCount: 4,
            currentSharePercent: 45.7,
            currentAverageBytes: 105_000,
            previousBytes: 240_000,
            previousCount: 3,
            deltaBytes: 180_000,
            deltaPercent: 75,
            deltaCount: 1,
            cumulative3MonthBytes: 180_000,
            cumulative3MonthPercent: 75,
            accelerationBytes: 90_000,
            accelerationPercent: 100,
            history: [],
            topFiles: [],
            mimeSubtypes: [],
            alerts: [],
          },
        ],
      },
      history: [
        {
          snapshotMonth: "2026-05-01",
          monthLabel: "mai 2026",
          generatedAt,
          totalBytes: 920_000,
          usagePercent: 92,
          bucketBreakdown: [],
          extensionBreakdown: [],
          businessBreakdown: [],
        },
        {
          snapshotMonth: "2026-04-01",
          monthLabel: "avril 2026",
          generatedAt: "2026-04-20T12:00:00.000Z",
          totalBytes: 740_000,
          usagePercent: 74,
          bucketBreakdown: [],
          extensionBreakdown: [],
          businessBreakdown: [],
        },
        {
          snapshotMonth: "2026-03-01",
          monthLabel: "mars 2026",
          generatedAt: "2026-03-20T12:00:00.000Z",
          totalBytes: 610_000,
          usagePercent: 61,
          bucketBreakdown: [],
          extensionBreakdown: [],
          businessBreakdown: [],
        },
      ],
      comparison: {
        previousSnapshotMonth: "2026-04-01",
        deltaBytes: 180_000,
        deltaPercent: 24.3,
        bucketGrowth: [],
        extensionGrowth: [],
      },
      warnings: ["Le quota gratuit approche de la saturation."],
      timestamp: generatedAt,
      snapshotMonth: "2026-05-01",
      snapshotPersisted: false,
      cron: {
        configured: true,
        statusLabel: "Configuré",
        schedule: "0 3 1 * *",
        scheduleLabel: "1er du mois à 03:00 UTC",
        timezone: "UTC",
        nextRunAt: "2026-06-01T03:00:00.000Z",
        nextRunLabel: "1 juin 2026 à 03:00 UTC",
      },
    } as unknown as Parameters<typeof buildGovernanceMonthlyReportPayload>[0]["storageUsage"];

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
});

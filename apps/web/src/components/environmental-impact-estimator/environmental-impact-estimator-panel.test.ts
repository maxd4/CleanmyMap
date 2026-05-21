import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EnvironmentalImpactEstimatorPanel } from "./environmental-impact-estimator-panel";
import { computeEnvironmentalImpactEstimate } from "@/lib/environmental-impact-estimator";

describe("EnvironmentalImpactEstimatorPanel", () => {
  it("renders the transparent estimator structure", () => {
    const markup = renderToStaticMarkup(
      React.createElement(EnvironmentalImpactEstimatorPanel, {
        model: computeEnvironmentalImpactEstimate(),
      }),
    );

    expect(markup).toContain("Estimateur d&#x27;impact environnemental");
    expect(markup).toContain("Impact total du site au jour J");
    expect(markup).toContain(
      "Impact par utilisateur depuis la création du compte",
    );
    expect(markup).toContain("Pages vues");
    expect(markup).toContain("Courbe temporelle");
    expect(markup).toContain("Documents à télécharger");
    expect(markup).toContain("Fonctionnement du graphique");
    expect(markup).toContain("Prochaines actions à plus fort impact");
    expect(markup).toContain("Réduire la charge Vercel");
    expect(markup).toContain("Deuxième ordre");
    expect(markup).toContain("CO2 brut");
    expect(markup).toContain("Empreinte matérielle et cycle de vie");
    expect(markup).toContain("Énergie");
    expect(markup).toContain("Serveurs");
    expect(markup).toContain("Vercel");
    expect(markup).toContain("Supabase");
    expect(markup).toContain("ChatGPT / LLM");
    expect(markup).toContain("Resend");
    expect(markup).toContain("Nom de domaine LWS");
    expect(markup).toContain("Notes de données manquantes");
    expect(markup).toContain("Vercel - données directes non branchées");
    expect(markup).toContain("Point hebdomadaire sélectionné");
    expect(markup).toContain("Granularité");
    expect(markup).toContain("Incertitude proxy");
    expect(markup).toContain("Pages vues / mois");
    expect(markup).toContain("Croissance mensuelle");
    expect(markup).toContain("Aucune source n&#x27;est encore branchée");
    expect(markup).toContain("Structure prête pour le rapport d&#x27;impact IA");
  });

  it("renders project signals and snapshot history when provided", () => {
    const markup = renderToStaticMarkup(
      React.createElement(EnvironmentalImpactEstimatorPanel, {
        model: computeEnvironmentalImpactEstimate(),
        signals: {
          generatedAt: "2026-05-20T12:00:00.000Z",
          launchedAt: "2025-05-20T12:00:00.000Z",
          accountCreatedAt: "2026-04-20T12:00:00.000Z",
          userId: "user_1",
          periodDays: 30,
          recentWindowDays: 30,
          siteInput: {},
          userInput: {},
          codexUsage: {
            generatedAt: "2026-05-20T12:00:00.000Z",
            windowWeeks: 4,
            source: "empty",
            weekCount: 0,
            sessionCount: 0,
            conversationCount: 0,
            turnCount: 0,
            toolCallCount: 0,
            shellCommandCount: 0,
            fileTouchCount: 0,
            testRunCount: 0,
            changedLineCount: 0,
            activeMinutes: 0,
            monthlyEquivalent: {
              sessionCount: 0,
              conversationCount: 0,
              turnCount: 0,
              toolCallCount: 0,
              shellCommandCount: 0,
              fileTouchCount: 0,
              testRunCount: 0,
              changedLineCount: 0,
              activeMinutes: 0,
              estimatedKgCo2eProxy: 0,
            },
            estimatedKgCo2eProxy: 0,
            confidencePercent: 0,
            uncertaintyPercent: 100,
            notes: [],
            weeklySnapshots: [],
          },
          infrastructureInput: {
            launchedAt: "2025-05-20T12:00:00.000Z",
            referencePeriodMonths: 12,
            usage: {
              monthlyPageViews: 1,
              monthlyActiveUsers: 1,
              monthlySessions: 1,
              monthlyEmailsSent: 1,
              monthlyDeployments: 1,
              monthlyPdfExports: 1,
              monthlyMapViews: 1,
              monthlyAiCalls: 1,
              monthlyStorageGbMonths: 1,
              monthlyApiRequests: 1,
              monthlyAuthEvents: 1,
              monthlyRealtimeEvents: 1,
              monthlyEgressGb: 1,
              monthlyBandwidthGb: 1,
              monthlyErrorEvents: 1,
              growthRateMonthly: 0.05,
              seasonalityAmplitude: 0.08,
              horizonMonths: 12,
            },
          },
          highlights: [
            {
              label: "Pages vues CleanMyMap",
              value: 12,
              detail: "Signal direct",
              basis: "all_time",
            },
            {
              label: "Emails Resend",
              value: 4,
              detail: "Historique des envois",
              basis: "recent",
            },
          ],
          signalBreakdown: {
            traffic: {
              pageViewEvents: 2,
              legacyPageViewEvents: 2,
              distinctRoutes: 2,
              topRoutes: [
                {
                  path: "/community",
                  count: 2,
                },
              ],
            },
            community: {
              events: 1,
              rsvps: 3,
              notifications: 2,
              unreadNotifications: 1,
            },
            communication: {
              emailsSent: 2,
              pdfExports: 1,
            },
          },
          notes: ["Données projet CleanMyMap."],
        },
        snapshots: [
          {
            id: "snapshot-1",
            snapshotKey: "cleanmymap-project",
            snapshotDate: "2026-05-20",
            generatedAt: "2026-05-20T12:00:00.000Z",
            version: "environmental-impact-estimator-2026.05-v1",
            totalKgCo2eProxy: 12.34,
            monthlyKgCo2eProxy: 1.23,
            annualKgCo2eProxy: 14.76,
            siteKgCo2eProxy: 5.67,
            userKgCo2eProxy: 6.67,
            confidencePercent: 82,
            uncertaintyPercent: 18,
            launchedAt: "2025-05-20T12:00:00.000Z",
            accountCreatedAt: "2026-04-20T12:00:00.000Z",
            model: computeEnvironmentalImpactEstimate(),
            signals: {
              generatedAt: "2026-05-20T12:00:00.000Z",
              launchedAt: "2025-05-20T12:00:00.000Z",
              accountCreatedAt: "2026-04-20T12:00:00.000Z",
              userId: "user_1",
              periodDays: 30,
              recentWindowDays: 30,
              siteInput: {},
              userInput: {},
              codexUsage: {
                generatedAt: "2026-05-20T12:00:00.000Z",
                windowWeeks: 4,
                source: "empty",
                weekCount: 0,
                sessionCount: 0,
                conversationCount: 0,
                turnCount: 0,
                toolCallCount: 0,
                shellCommandCount: 0,
                fileTouchCount: 0,
                testRunCount: 0,
                changedLineCount: 0,
                activeMinutes: 0,
                monthlyEquivalent: {
                  sessionCount: 0,
                  conversationCount: 0,
                  turnCount: 0,
                  toolCallCount: 0,
                  shellCommandCount: 0,
                  fileTouchCount: 0,
                  testRunCount: 0,
                  changedLineCount: 0,
                  activeMinutes: 0,
                  estimatedKgCo2eProxy: 0,
                },
                estimatedKgCo2eProxy: 0,
                confidencePercent: 0,
                uncertaintyPercent: 100,
                notes: [],
                weeklySnapshots: [],
              },
              infrastructureInput: {
                launchedAt: "2025-05-20T12:00:00.000Z",
                referencePeriodMonths: 12,
                usage: {
                  monthlyPageViews: 1,
                  monthlyActiveUsers: 1,
                  monthlySessions: 1,
                  monthlyEmailsSent: 1,
                  monthlyDeployments: 1,
                  monthlyPdfExports: 1,
                  monthlyMapViews: 1,
                  monthlyAiCalls: 1,
                  monthlyStorageGbMonths: 1,
                  monthlyApiRequests: 1,
                  monthlyAuthEvents: 1,
                  monthlyRealtimeEvents: 1,
                  monthlyEgressGb: 1,
                  monthlyBandwidthGb: 1,
                  monthlyErrorEvents: 1,
                  growthRateMonthly: 0.05,
                  seasonalityAmplitude: 0.08,
                  horizonMonths: 12,
                },
              },
              highlights: [],
              notes: ["Données projet CleanMyMap."],
            },
          },
        ],
      }),
    );

    expect(markup).toContain("Signaux projet CleanMyMap");
    expect(markup).toContain("Données réellement branchées dans le calcul");
    expect(markup).toContain("Signaux projet détaillés");
    expect(markup).toContain("Trafic");
    expect(markup).toContain("Communauté");
    expect(markup).toContain("Communications");
    expect(markup).toContain("Notes de données manquantes");
    expect(markup).toContain("Historique Supabase");
    expect(markup).toContain("Pages vues CleanMyMap");
    expect(markup).toContain("Snapshots enregistrés du calculateur");
  });
});

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { EnvironmentalImpactSnapshotRecord } from "@/lib/environmental-impact-estimator";
import { FreePlanServicesPanel } from "./free-plan-services-panel";

const useSWRMock = vi.hoisted(() => vi.fn());

vi.mock("swr", () => ({
  default: useSWRMock,
}));

describe("FreePlanServicesPanel", () => {
  it("renders the free-tier services sheet", () => {
    const snapshots = [
      {
        snapshotDate: "2026-05-01",
        model: {
          infrastructure: {
            services: [
              {
                key: "vercel",
                monthlyKgCo2eProxy: 1.5,
              },
              {
                key: "supabase",
                monthlyKgCo2eProxy: 2.1,
              },
            ],
          },
        },
      },
    ] as unknown as EnvironmentalImpactSnapshotRecord[];

    useSWRMock.mockImplementation((key: unknown) => {
      const url = Array.isArray(key) ? String(key[0] ?? "") : String(key ?? "");

      if (url.includes("/api/services")) {
        return {
          data: {
            status: "ok",
            services: {
              vercel: {
                state: "external",
                label: "Vercel",
                description: "Hébergement front",
                category: "external",
                severity: "warning",
                statusMessage: "",
              },
              supabase: {
                state: "ready",
                label: "Supabase",
                description: "Base de données",
                category: "critical",
                severity: "ok",
                statusMessage: "",
              },
            },
            missing: [],
            timestamp: "2026-05-20T12:00:00.000Z",
          },
          isLoading: false,
          isValidating: false,
          error: null,
          mutate: vi.fn(),
        };
      }

      return {
        data: {
          status: "ok",
          model: {
            generatedAt: "2026-05-20T12:00:00.000Z",
            infrastructure: {
              services: [
                {
                  key: "vercel",
                  label: "Vercel",
                  description: "Hébergement front",
                  sourceNote: "Charge réseau et exécution serverless dominantes.",
                  basis: "monthly",
                  status: "derived",
                  monthlyKgCo2eProxy: 1.2,
                  annualKgCo2eProxy: 14.4,
                  sharePercent: 32,
                  confidencePercent: 82,
                  uncertaintyPercent: 18,
                  metricCount: 2,
                  referenceMetricCount: 0,
                  metricEstimates: [
                    {
                      key: "vercelPageViews",
                      label: "Vercel - pages vues",
                      unitLabel: "pages / mois",
                      proxyKgCo2ePerUnit: 0.000015,
                      referenceMonthlyQuantity: 120_000,
                      quantityPerMonth: 140_000,
                      estimatedKgCo2eProxy: 2.1,
                      source: "derived",
                    },
                    {
                      key: "vercelDeployments",
                      label: "Vercel - déploiements",
                      unitLabel: "déploiements / mois",
                      proxyKgCo2ePerUnit: 0.015,
                      referenceMonthlyQuantity: 24,
                      quantityPerMonth: 12,
                      estimatedKgCo2eProxy: 0.18,
                      source: "derived",
                    },
                  ],
                },
                {
                  key: "supabase",
                  label: "Supabase",
                  description: "Base de données",
                  sourceNote: "Consommation liée aux requêtes, au stockage et aux flux temps réel.",
                  basis: "monthly",
                  status: "ready",
                  monthlyKgCo2eProxy: 2.4,
                  annualKgCo2eProxy: 28.8,
                  sharePercent: 68,
                  confidencePercent: 90,
                  uncertaintyPercent: 10,
                  metricCount: 2,
                  referenceMetricCount: 0,
                  metricEstimates: [
                    {
                      key: "supabaseDbRequests",
                      label: "Supabase - requêtes DB",
                      unitLabel: "requêtes / mois",
                      proxyKgCo2ePerUnit: 0.000004,
                      referenceMonthlyQuantity: 420_000,
                      quantityPerMonth: 450_000,
                      estimatedKgCo2eProxy: 1.8,
                      source: "input",
                    },
                    {
                      key: "supabaseStorageGbMonths",
                      label: "Supabase - stockage",
                      unitLabel: "GB-mois",
                      proxyKgCo2ePerUnit: 0.015,
                      referenceMonthlyQuantity: 45,
                      quantityPerMonth: 3.2,
                      estimatedKgCo2eProxy: 0.48,
                      source: "derived",
                    },
                  ],
                },
              ],
            },
          },
          signals: {
            generatedAt: "2026-05-20T12:00:00.000Z",
          },
          snapshots,
          focus: "free-tier-services",
        },
        isLoading: false,
        isValidating: false,
        error: null,
        mutate: vi.fn(),
      };
    });

    const markup = renderToStaticMarkup(React.createElement(FreePlanServicesPanel));

    expect(markup).toContain("Plans gratuits surveillés");
    expect(markup).toContain("Pression mensuelle totale");
    expect(markup).toContain("Vercel");
    expect(markup).toContain("Supabase");
    expect(markup).toContain("Sélecteur des plans gratuits");
    expect(markup).toContain("Pollution mensuelle");
    expect(markup).toContain("Pollution annuelle");
    expect(markup).toContain("NA");
    expect(markup).toContain("Dérive mensuelle");
    expect(markup).toContain("Service le plus exposé");
    expect(markup).toContain("Lecture de décision");
    expect(markup).toContain("Quota principal");
    expect(markup).toContain("plan gratuit");
    expect(markup).toContain("prix NA");
    expect(markup).toContain("dépassé");
    expect(markup).toContain("Franchissement de seuil");
    expect(markup).toContain("Liens de pilotage");
    expect(markup).toContain("Méthodologie de calcul");
  });
});

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  EnvironmentalImpactInfrastructureMetricEstimate,
  EnvironmentalImpactInfrastructureServiceEstimate,
} from "@/lib/environmental-impact-estimator/types";
import { FreePlanServicesMethodologyVisual } from "./free-plan-services-methodology-visual";

function metric(
  overrides: Partial<EnvironmentalImpactInfrastructureMetricEstimate> &
    Pick<EnvironmentalImpactInfrastructureMetricEstimate, "key" | "label" | "unitLabel" | "referenceMonthlyQuantity">,
): EnvironmentalImpactInfrastructureMetricEstimate {
  return {
    key: overrides.key,
    label: overrides.label,
    unitLabel: overrides.unitLabel,
    proxyKgCo2ePerUnit: overrides.proxyKgCo2ePerUnit ?? 0.00001,
    referenceMonthlyQuantity: overrides.referenceMonthlyQuantity,
    quantityPerMonth: overrides.quantityPerMonth ?? null,
    estimatedKgCo2eProxy: overrides.estimatedKgCo2eProxy ?? null,
    source: overrides.source ?? "input",
  };
}

function service(
  overrides: Partial<EnvironmentalImpactInfrastructureServiceEstimate> &
    Pick<
      EnvironmentalImpactInfrastructureServiceEstimate,
      | "key"
      | "label"
      | "description"
      | "sourceNote"
      | "basis"
      | "status"
      | "monthlyKgCo2eProxy"
      | "annualKgCo2eProxy"
      | "sharePercent"
      | "confidencePercent"
      | "uncertaintyPercent"
      | "metricCount"
      | "referenceMetricCount"
      | "metricEstimates"
    >,
): EnvironmentalImpactInfrastructureServiceEstimate {
  return {
    key: overrides.key,
    label: overrides.label,
    description: overrides.description,
    sourceNote: overrides.sourceNote,
    basis: overrides.basis,
    status: overrides.status,
    monthlyKgCo2eProxy: overrides.monthlyKgCo2eProxy,
    annualKgCo2eProxy: overrides.annualKgCo2eProxy,
    sharePercent: overrides.sharePercent,
    confidencePercent: overrides.confidencePercent,
    uncertaintyPercent: overrides.uncertaintyPercent,
    metricCount: overrides.metricCount,
    referenceMetricCount: overrides.referenceMetricCount,
    metricEstimates: overrides.metricEstimates,
  };
}

const services = [
  service({
    key: "supabase",
    label: "Supabase",
    description: "Base de données, authentification, stockage et realtime.",
    sourceNote: "Consommation liée aux requêtes, au stockage et aux flux temps réel.",
    basis: "monthly",
    status: "partial",
    monthlyKgCo2eProxy: 0.82,
    annualKgCo2eProxy: 9.84,
    sharePercent: 29.3,
    confidencePercent: 84,
    uncertaintyPercent: 16,
    metricCount: 2,
    referenceMetricCount: 0,
    metricEstimates: [
      metric({
        key: "supabaseStorageGbMonths",
        label: "Supabase - stockage",
        unitLabel: "GB-mois",
        referenceMonthlyQuantity: 45,
        quantityPerMonth: 43,
        estimatedKgCo2eProxy: 0.645,
      }),
      metric({
        key: "supabaseDbRequests",
        label: "Supabase - requêtes DB",
        unitLabel: "requêtes / mois",
        referenceMonthlyQuantity: 420_000,
        quantityPerMonth: 98_000,
        estimatedKgCo2eProxy: 0.392,
      }),
    ],
  }),
  service({
    key: "vercel",
    label: "Vercel",
    description: "Hébergement front, fonctions serverless, déploiements et diffusion.",
    sourceNote: "Charge réseau et exécution serverless dominantes.",
    basis: "monthly",
    status: "ready",
    monthlyKgCo2eProxy: 0.54,
    annualKgCo2eProxy: 6.48,
    sharePercent: 19.3,
    confidencePercent: 87,
    uncertaintyPercent: 13,
    metricCount: 2,
    referenceMetricCount: 0,
    metricEstimates: [
      metric({
        key: "vercelDeployments",
        label: "Vercel - déploiements",
        unitLabel: "déploiements / mois",
        referenceMonthlyQuantity: 24,
        quantityPerMonth: 4,
        estimatedKgCo2eProxy: 0.06,
      }),
      metric({
        key: "vercelBandwidthGb",
        label: "Vercel - bande passante",
        unitLabel: "GB / mois",
        referenceMonthlyQuantity: 180,
        quantityPerMonth: 70,
        estimatedKgCo2eProxy: 0.48,
      }),
    ],
  }),
  service({
    key: "resend",
    label: "Resend",
    description: "Envoi d'emails transactionnels et lots de notifications.",
    sourceNote: "Les emails sont modélisés séparément des autres services.",
    basis: "monthly",
    status: "ready",
    monthlyKgCo2eProxy: 0.14,
    annualKgCo2eProxy: 1.68,
    sharePercent: 5.0,
    confidencePercent: 90,
    uncertaintyPercent: 10,
    metricCount: 2,
    referenceMetricCount: 0,
    metricEstimates: [
      metric({
        key: "resendEmailsSent",
        label: "Resend - emails",
        unitLabel: "emails / mois",
        referenceMonthlyQuantity: 2_500,
        quantityPerMonth: 1_200,
        estimatedKgCo2eProxy: 0.024,
      }),
      metric({
        key: "resendBatchRequests",
        label: "Resend - lots",
        unitLabel: "lots / mois",
        referenceMonthlyQuantity: 120,
        quantityPerMonth: 32,
        estimatedKgCo2eProxy: 0.116,
      }),
    ],
  }),
  service({
    key: "posthog",
    label: "PostHog",
    description: "Instrumentation produit, événements et analyse d'usage.",
    sourceNote: "Les événements analytiques restent séparés du trafic front.",
    basis: "monthly",
    status: "partial",
    monthlyKgCo2eProxy: 0.31,
    annualKgCo2eProxy: 3.72,
    sharePercent: 11.1,
    confidencePercent: 79,
    uncertaintyPercent: 21,
    metricCount: 1,
    referenceMetricCount: 0,
    metricEstimates: [
      metric({
        key: "posthogEvents",
        label: "PostHog - événements",
        unitLabel: "événements / mois",
        referenceMonthlyQuantity: 90_000,
        quantityPerMonth: 79_000,
        estimatedKgCo2eProxy: 0.31,
      }),
    ],
  }),
  service({
    key: "lwsDomain",
    label: "LWS",
    description: "Nom de domaine et résolution DNS associés au projet.",
    sourceNote: "Le domaine est amorti pour apparaître correctement dans la courbe temporelle.",
    basis: "annual",
    status: "partial",
    monthlyKgCo2eProxy: 0.09,
    annualKgCo2eProxy: 1.08,
    sharePercent: 3.2,
    confidencePercent: 73,
    uncertaintyPercent: 27,
    metricCount: 2,
    referenceMetricCount: 0,
    metricEstimates: [
      metric({
        key: "lwsDomainYears",
        label: "Nom de domaine LWS",
        unitLabel: "an",
        referenceMonthlyQuantity: 1 / 12,
        quantityPerMonth: 0.08,
        estimatedKgCo2eProxy: 0.08,
      }),
      metric({
        key: "lwsDnsQueries",
        label: "LWS - requêtes DNS",
        unitLabel: "requêtes / mois",
        referenceMonthlyQuantity: 80_000,
        quantityPerMonth: 18_000,
        estimatedKgCo2eProxy: 0.01,
      }),
    ],
  }),
  service({
    key: "chatgpt",
    label: "GPT-5.4 mini — développement du site",
    description: "Modèle IA utilisé pendant le développement CleanMyMap.",
    sourceNote: "Inclus ACV, hors production et hors quotas web.",
    basis: "monthly",
    status: "derived",
    monthlyKgCo2eProxy: 0.2,
    annualKgCo2eProxy: 2.4,
    sharePercent: 7.1,
    confidencePercent: 76,
    uncertaintyPercent: 24,
    metricCount: 1,
    referenceMetricCount: 0,
    metricEstimates: [
      metric({
        key: "chatgptConversationHours",
        label: "GPT-5.4 mini - conversations LLM",
        unitLabel: "heures / mois",
        referenceMonthlyQuantity: 8.6666666667,
        quantityPerMonth: 1.6,
        estimatedKgCo2eProxy: 0.2,
      }),
    ],
  }),
  service({
    key: "codex",
    label: "Codex — développement du site",
    description: "Sessions de développement assisté CleanMyMap.",
    sourceNote: "Inclus ACV, hors production et hors quotas web.",
    basis: "monthly",
    status: "reference",
    monthlyKgCo2eProxy: 0.05,
    annualKgCo2eProxy: 0.6,
    sharePercent: 1.8,
    confidencePercent: 68,
    uncertaintyPercent: 32,
    metricCount: 1,
    referenceMetricCount: 1,
    metricEstimates: [
      metric({
        key: "codexSessions",
        label: "Codex - sessions",
        unitLabel: "sessions / mois",
        referenceMonthlyQuantity: 0,
        quantityPerMonth: 0,
        estimatedKgCo2eProxy: 0.05,
        source: "reference",
      }),
    ],
  }),
] satisfies EnvironmentalImpactInfrastructureServiceEstimate[];

describe("FreePlanServicesMethodologyVisual", () => {
  it("renders the impact tab with real services and the ACV development split", () => {
    const markup = renderToStaticMarkup(
      React.createElement(FreePlanServicesMethodologyVisual, {
        services,
        isFrench: true,
      }),
    );

    expect(markup).toContain("Impact carbone des services suivis");
    expect(markup).toContain("Relais actif");
    expect(markup).toContain("Impact carbone");
    expect(markup).toContain("Supabase");
    expect(markup).toContain("Vercel");
    expect(markup).toContain("GitHub");
    expect(markup).toContain("Resend");
    expect(markup).toContain("PostHog");
    expect(markup).toContain("LWS");
    expect(markup).toContain("IA de développement");
    expect(markup).toContain("GPT-5.4 mini — développement du site");
    expect(markup).toContain("Codex — développement du site");
    expect(markup).toContain("Inclus ACV");
    expect(markup).toContain("Hors production");
    expect(markup).toContain("Hors quotas web");
    expect(markup).toContain("Services suivis");
    expect(markup).toContain("Plans payants");
    expect(markup).toContain("Services proches d&#x27;une limite");
    expect(markup).toContain("NA");
    expect(markup).toContain("Voir la charte");
  });

  it("renders the quota dashboard when requested", () => {
    const markup = renderToStaticMarkup(
      React.createElement(FreePlanServicesMethodologyVisual, {
        services,
        isFrench: true,
        initialTab: "quota",
      }),
    );

    expect(markup).toContain("Quotas &amp; plans des services web");
    expect(markup).toContain("Vue d&#x27;ensemble");
    expect(markup).toContain("Quotas &amp; plans");
    expect(markup).toContain("Impact carbone");
    expect(markup).toContain("Suivi des quotas par service");
    expect(markup).toContain("Détail des quotas");
    expect(markup).toContain("Supabase - stockage");
    expect(markup).toContain("NA");
    expect(markup).toContain("Plans payants");
    expect(markup).toContain("Services suivis");
    expect(markup).toContain("Services proches d&#x27;une limite");
    expect(markup).not.toContain("GPT-5.4 mini — développement du site");
    expect(markup).not.toContain("Croissance mensuelle");
    expect(markup).not.toContain("Delta vs N-1");
  });

  it("renders NA when no quota data is available in the quota tab", () => {
    const markup = renderToStaticMarkup(
      React.createElement(FreePlanServicesMethodologyVisual, {
        services: [],
        isFrench: true,
        initialTab: "quota",
      }),
    );

    expect(markup).toContain("GitHub");
    expect(markup).toContain("NA");
    expect(markup).toContain("Aucune donnée de quota n&#x27;est branchée");
  });
});

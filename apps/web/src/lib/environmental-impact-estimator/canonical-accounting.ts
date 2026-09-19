import type { EnvironmentalImpactCanonicalAccounting } from "./types";

/**
 * Canonical project-level accounting validated by the environmental audit.
 * Activity observations are intentionally kept separate from physical impacts.
 */
export const ENVIRONMENTAL_IMPACT_CANONICAL_ACCOUNTING = {
  statusVocabulary: [
    "OBSERVED",
    "DERIVED",
    "DECLARED",
    "ASSUMPTION",
    "PROXY",
    "NA",
  ],
  projectPeriod: "mi-février → septembre 2026",
  serviceAuditWindow: "18 mars → 18 septembre 2026",
  pre18MarchServiceUsage: "UNKNOWN / NOT AUDITED",
  centralAi: {
    tokenEquivalent: 35_000_000_000,
    tokenStatus: ["DECLARED", "ASSUMPTION"],
    energyKwhCalculated: 10_500,
    energyMwhDisplayed: 10,
    electricalCo2eKgCalculated: 3_675,
    electricalCo2eTDisplayed: 3.7,
    indirectWaterLitersCalculated: 47_500,
    indirectWaterM3Displayed: 45,
    partialLcaCo2eKgCalculated: 4_800,
    partialLcaTDisplayed: 5,
    physicalStatus: "PROXY",
    partialLcaStatus: ["ASSUMPTION", "PROXY"],
  },
  chatgpt: {
    exactUsageStatus: "NA",
    environmentalStatus: "NA",
    note: "L'usage exact ChatGPT hors Codex n'est pas audité; aucune durée ni aucun token n'est reconstruit.",
  },
  images: {
    quantity: 130,
    quantityStatus: "DECLARED",
    energyStatus: "NA",
    co2eStatus: "NA",
    waterStatus: "NA",
  },
  services: {
    vercel: { visibleDeployments: 120, status: "OBSERVED", physicalImpactStatus: "NA" },
    supabase: {
      funnelEvents: 1_437,
      storageBuckets: 4,
      status: "OBSERVED",
      physicalImpactStatus: "NA",
    },
    githubActions: {
      totalRuns: 2_340,
      ciRuns: 1_052,
      codeqlRuns: 1_072,
      dependabotRuns: 216,
      status: "OBSERVED",
      dependabotStatus: "DERIVED",
      physicalImpactStatus: "NA",
    },
    clerk: { visibleUsers: 4, status: "OBSERVED", physicalImpactStatus: "NA" },
    lws: {
      dnsRole: "OBSERVED",
      webHosting: "NOT_DEMONSTRATED",
      physicalImpactStatus: "NA",
    },
  },
  materials: {
    projectInducedPurchase: 0,
    projectInducedPurchaseStatus: "DECLARED",
    incrementalEmbodiedCarbon: 0,
    incrementalEmbodiedCarbonStatus: "DERIVED",
    existingHardwareLcaStatus: "NA",
    localDeviceElectricityStatus: "NA",
    printing: 0,
    printingStatus: "DECLARED",
    ink: 0,
    inkStatus: "DECLARED",
    digitalDevelopmentTravel: 0,
    digitalDevelopmentTravelStatus: "DECLARED",
  },
} as const satisfies EnvironmentalImpactCanonicalAccounting;
